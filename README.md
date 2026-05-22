# Chagatai RAMZ

**Chagatai RAMZ** представляет собой веб-сервис для нормализации текстов на чагатайской и близкой арабографичной письменности. Система состоит из двух частей, работающих как единое приложение: пользовательского интерфейса `chagatai-ramz` и backend-сервиса `ramz-service`.
 
Основная задача системы состоит в приведении разнородного арабографичного текста к более единообразной Unicode-форме. Сервис обрабатывает варианты букв, цифр, пробельные символы, невидимые управляющие знаки, диакритику и графические соединители. Дополнительно система возвращает список выполненных изменений, чтобы пользователь мог видеть не только итоговый текст, но и конкретные места, где были применены правила нормализации.

## 1. Архитектура системы

Система разделена на frontend и backend. Frontend расположен в `frontend/ramz` и реализован на Next.js. Backend расположен в `services/ramz-service` и реализован на FastAPI. Связь между ними выполняется через HTTP API.

Общая схема работы:

```text
Пользовательский ввод / TXT-файл
        ↓
chagatai-ramz frontend
        ↓ HTTP POST
ramz-service FastAPI
        ↓
Unicode-нормализация и правила RAMZ
        ↓
Нормализованный текст + список изменений
        ↓
Подсветка результата в интерфейсе
```

В Docker Compose приложение запускается как отдельная пара сервисов:

```yaml
ramz-service:
  build:
    context: ./services/ramz-service
    dockerfile: Dockerfile
  container_name: ramz-service
  expose:
    - "8000"

ramz-frontend:
  build:
    context: ./frontend/ramz
    dockerfile: Dockerfile
    args:
      NEXT_PUBLIC_API_BASE_URL: /api/ramz
  container_name: ramz-frontend
  expose:
    - "3000"
```

Маршрутизация через nginx связывает внешний путь `/ramz` с frontend-частью, а путь `/api/ramz/` с backend API:

```nginx
location /ramz/ {
    proxy_pass http://ramz-frontend:3000/;
}

location /api/ramz/ {
    proxy_pass http://ramz-service:8000/api/;
}
```

## 2. Backend RAMZ Service

Backend-сервис находится в `services/ramz-service`. Он предоставляет API для нормализации текста, нормализации файлов и проверки работоспособности. Основное приложение создается в `main.py`:

```py
app = FastAPI(title="Chagatai RAMZ Normalizer API", version="1.0.0")
```

Для обмена данными используются Pydantic-модели. Запрос содержит исходный текст и набор опций нормализации:

```py
class OptionsPayload(BaseModel):
    remove_tatweel: bool = False
    normalize_kaf_yay: bool = True
    remove_diacritics: bool = False
    collapse_whitespace: bool = True
    normalize_persian_digits: bool = True
    add_zwnj: bool = True
    strip_zero_width: bool = True
    nfkc: bool = True


class NormalizeRequest(BaseModel):
    text: str
    options: OptionsPayload = Field(default_factory=OptionsPayload)
```

Ответ содержит нормализованный текст и массив изменений:

```py
class NormalizeResponse(BaseModel):
    text: str
    changes: list[ChangePayload]
```

Такой формат важен для авторской части системы: результат не является "черным ящиком". Каждая замена, вставка или удаление возвращается как структурированное событие с координатами в исходной и результирующей строке.

## 3. HTTP API

Сервис предоставляет следующие основные endpoint-ы:

```py
@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")
```

`/api/health` используется Docker Compose и nginx-инфраструктурой для проверки готовности сервиса.

```py
@app.get("/api/options", response_model=list[OptionMeta])
def options() -> list[OptionMeta]:
    return OPTION_META
```

`/api/options` возвращает описание доступных правил нормализации: ключ, название, пояснение и значение по умолчанию.

```py
@app.post("/api/normalize", response_model=NormalizeResponse)
def normalize_endpoint(payload: NormalizeRequest) -> NormalizeResponse:
    return normalize_text(payload.text, payload.options)
```

`/api/normalize` выполняет нормализацию текста, введенного пользователем в интерфейсе.

```py
@app.post("/api/normalize-file", response_model=NormalizeResponse)
async def normalize_file_endpoint(
    file: Annotated[UploadFile, File()],
    options_json: Annotated[str, Form()] = "{}",
) -> NormalizeResponse:
    if file.content_type and file.content_type not in {"text/plain", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Поддерживаются только .txt файлы")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Файл должен быть в UTF-8") from exc

    options = OptionsPayload.model_validate_json(options_json)
    return normalize_text(text, options)
```

`/api/normalize-file` принимает `.txt`-файл, проверяет тип содержимого, декодирует UTF-8 с поддержкой BOM и применяет те же правила, что и для ручного ввода.

## 4. Настройки нормализации

Класс `NormalizationOptions` в `chagatai_normalizer.py` описывает набор управляемых правил. Каждое правило можно включать и выключать отдельно:

```py
@dataclass
class NormalizationOptions:
    remove_tatweel: bool = False
    normalize_kaf_yay: bool = True
    remove_diacritics: bool = False
    collapse_whitespace: bool = True
    normalize_persian_digits: bool = True
    add_zwnj: bool = True
    strip_zero_width: bool = True
    nfkc: bool = True
```

Назначение основных правил:

- `nfkc` применяет совместимую Unicode-нормализацию перед остальными шагами.
- `strip_zero_width` удаляет невидимые управляющие символы ZWJ, LRM, RLM, ALM и BOM.
- `normalize_persian_digits` переводит персидские цифры `۰-۹` в восточно-арабские `٠-٩`.
- `remove_tatweel` удаляет символ графической протяжки `ـ`.
- `remove_diacritics` удаляет арабские вокализационные знаки.
- `normalize_kaf_yay` приводит варианты kaf, yay и heh к каноническим формам.
- `add_zwnj` добавляет Zero-Width Non-Joiner для предотвращения нежелательного слияния форм.
- `collapse_whitespace` сжимает повторяющиеся пробелы и табы внутри строк.

## 5. Карта канонических символов

Одной из ключевых частей сервиса является таблица соответствий между вариантными и каноническими символами. Она позволяет привести разные варианты письма к единому представлению:

```py
_KAF_YAY_MAP: dict[str, str] = {
    "\u06a9": "\u0643",  # ک → ك
    "\u06aa": "\u0643",  # ڪ → ك
    "\u06cc": "\u064a",  # ی → ي
    "\u0649": "\u064a",  # ى → ي
    "\u06d5": "\u0647",  # ە → ه
    "\u06be": "\u0647",  # ھ → ه
    "\u06c1": "\u0647",  # ہ → ه
    "\u06c3": "\u0629",  # ۃ → ة
}
```

Для цифр используется стандартная таблица трансляции:

```py
_PERSIAN_TO_ARABIC_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "٠١٢٣٤٥٦٧٨٩")
```

Отдельные регулярные выражения выделяют невидимые символы и диакритику:

```py
_ZERO_WIDTH_RE = regex.compile(r"[\u200d\u200e\u200f\u061c\ufeff]")
_DIACRITICS_RE = regex.compile(r"[\u064b-\u065f\u0670\u06d6-\u06ed]")
```

## 6. Алгоритм нормализации

Главная функция `normalize` последовательно применяет выбранные пользователем правила. Порядок важен: сначала выполняется общая Unicode-нормализация, затем удаляются невидимые символы, приводятся цифры и буквы, после чего добавляется ZWNJ и сжимаются пробелы.

```py
def normalize(
    text: str,
    options: Optional[NormalizationOptions] = None,
) -> NormalizationResult:
    if options is None:
        options = NormalizationOptions()

    out = text

    if options.nfkc:
        out = unicodedata.normalize("NFKC", out)

    if options.strip_zero_width:
        out = _ZERO_WIDTH_RE.sub("", out)

    if options.normalize_persian_digits:
        out = out.translate(_PERSIAN_TO_ARABIC_DIGITS)

    if options.remove_tatweel:
        out = out.replace("\u0640", "")

    if options.remove_diacritics:
        out = _DIACRITICS_RE.sub("", out)

    if options.normalize_kaf_yay:
        out = "".join(_KAF_YAY_MAP.get(ch, ch) for ch in out)

    if options.add_zwnj:
        out = _add_zwnj(out)

    if options.collapse_whitespace:
        lines_out = out.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        lines_out = [re.sub(r"[ \t]+", " ", ln).strip() for ln in lines_out]
        out = "\n".join(lines_out)
```

Эта последовательность формирует предсказуемый pipeline:

```text
raw text
  -> Unicode NFKC
  -> remove invisible controls
  -> normalize digits
  -> optional tatweel removal
  -> optional diacritic removal
  -> normalize kaf/yay/heh variants
  -> insert ZWNJ
  -> collapse whitespace
  -> build change list
```

## 7. Правило вставки ZWNJ

Для арабографичных письменностей важно контролировать соединение букв. Сервис добавляет символ Zero-Width Non-Joiner перед начальными или изолированными формами, если предыдущий символ может соединяться влево и без разделителя произошло бы нежелательное слияние.

Проверка способности символа соединяться выполняется через Unicode-имя:

```py
def _connects_to_left(char: str) -> bool:
    mapped = _KAF_YAY_MAP.get(char, char)
    try:
        name = unicodedata.name(mapped)
    except ValueError:
        return False
    parts = name.split()
    if "YEH" in parts or "ALEF MAKSURA" in name:
        return True
    if any(nj in parts for nj in _NON_LEFT_JOINERS):
        return False
    if "TEH" in parts and "MARBUTA" in parts:
        return False
    return "ARABIC" in parts
```

Сама вставка ZWNJ выполняется при проходе по строке:

```py
def _add_zwnj(text: str) -> str:
    result: list[str] = []
    ZWNJ_CHARS = {" ", "\t", "\n", "\r", "\u200c", "\u200d", "\u200e", "\u200f"}
    for i, curr in enumerate(text):
        if i > 0:
            prev = result[-1]
            if prev not in ZWNJ_CHARS:
                name_prev = unicodedata.name(prev, "")
                if "INITIAL FORM" not in name_prev and "MEDIAL FORM" not in name_prev:
                    if _connects_to_left(prev):
                        name_curr = unicodedata.name(curr, "")
                        if "INITIAL FORM" in name_curr or "ISOLATED FORM" in name_curr:
                            result.append("\u200c")
        result.append(curr)
    return "".join(result)
```

Это правило делает результат более устойчивым при отображении в редакторах и браузерах, где арабские формы могут автоматически соединяться.

## 8. Учет изменений

Важная особенность сервиса заключается в том, что он возвращает не только итоговую строку, но и карту изменений. Для этого используются три структуры данных:

```py
@dataclass
class Change:
    type: str
    src_start: int
    src_end: int
    src_text: str
    dst_start: int
    dst_end: int
    dst_text: str
    reason: str = ""


@dataclass
class NormalizationResult:
    text: str
    changes: List[Change] = field(default_factory=list)
```

После нормализации исходная и результирующая строки сравниваются на уровне графемных кластеров. Это важно для арабографичного текста, где один визуальный знак может состоять из нескольких Unicode-кодов.

```py
def _graphemes(s: str) -> list[str]:
    raw = regex.findall(r"\X", s)
    out: list[str] = []
    for cluster in raw:
        if "\u200c" in cluster:
            parts = cluster.split("\u200c")
            for i, p in enumerate(parts):
                if p:
                    out.append(p)
                if i < len(parts) - 1:
                    out.append("\u200c")
        else:
            out.append(cluster)
    return out
```

Для сопоставления используется алгоритм Левенштейна с обратным проходом:

```py
def _levenshtein_align(src: list[str], dst: list[str]) -> list[tuple]:
    n, m = len(src), len(dst)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]
    ...
    return ops
```

Затем операции `replace`, `delete` и `insert` преобразуются в объекты `Change` с координатами в исходном и нормализованном тексте. Соседние однотипные операции объединяются, чтобы интерфейс показывал изменения компактно.

## 9. Маркировка причин изменений

Каждое изменение получает человекочитаемую причину. Это нужно для подсветки в интерфейсе и для объяснимости результата:

```py
def _tag_reason(change: Change) -> str:
    s, d = change.src_text, change.dst_text

    if "\u200c" in d and "\u200c" not in s:
        return "zwnj_inserted"

    if s == "\u0640":
        return "tatweel_removed"

    if all(c in _KAF_YAY_MAP for c in s) and change.type == "replace":
        return "kaf_yay_normalized"

    if change.type == "replace" and s in "۰۱۲۳۴۵۶۷۸۹":
        return "persian_digit"

    if change.type == "delete" and all(
        regex.match(r"[\u064b-\u065f\u0670\u06d6-\u06ed]", c) for c in s
    ):
        return "diacritic_removed"

    if change.type == "delete" and s in "\u200d\u200e\u200f\u061c\ufeff":
        return "zero_width_removed"

    if re.match(r"^\s+$", s) or re.match(r"^\s+$", d):
        return "whitespace_collapsed"

    return "other"
```

Поддерживаемые причины:

- `zwnj_inserted` - вставлен Zero-Width Non-Joiner.
- `tatweel_removed` - удален татвил.
- `kaf_yay_normalized` - нормализованы варианты букв.
- `persian_digit` - заменена персидская цифра.
- `diacritic_removed` - удалена диакритика.
- `zero_width_removed` - удален невидимый управляющий символ.
- `whitespace_collapsed` - нормализованы пробелы.
- `other` - прочее изменение.

## 10. Построчная обработка

Для больших текстов и файлов используется функция `normalize_lines`. Она обрабатывает каждую строку отдельно, но сохраняет глобальные координаты изменений относительно всего текста:

```py
def normalize_lines(
    text: str,
    options: Optional[NormalizationOptions] = None,
) -> NormalizationResult:
    raw_lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out_lines: list[str] = []
    all_changes: list[Change] = []

    src_cursor = 0
    dst_cursor = 0

    for raw_line in raw_lines:
        result = normalize(raw_line, options)
        norm_line = result.text

        for ch in result.changes:
            all_changes.append(Change(
                type=ch.type,
                src_start=src_cursor + ch.src_start,
                src_end=src_cursor + ch.src_end,
                src_text=ch.src_text,
                dst_start=dst_cursor + ch.dst_start,
                dst_end=dst_cursor + ch.dst_end,
                dst_text=ch.dst_text,
                reason=ch.reason,
            ))

        out_lines.append(norm_line)
        src_cursor += len(raw_line) + 1
        dst_cursor += len(norm_line) + 1

    return NormalizationResult(
        text="\n".join(out_lines),
        changes=all_changes,
    )
```

Такой подход позволяет сохранять структуру абзацев и корректно подсвечивать изменения даже после построчной очистки пробелов.

## 11. Frontend Chagatai RAMZ

Frontend расположен в `frontend/ramz`. Главная страница реализована компонентом `NormalizerPage`. Интерфейс состоит из двух текстовых областей: исходный текст слева и нормализованный результат справа. Настройки вынесены в отдельную боковую панель.

Автоматическая нормализация запускается при изменении исходного текста или опций:

```tsx
useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    void normalize();
  }, 250);

  return () => window.clearTimeout(timeoutId);
}, [source, options, normalize]);
```

Задержка в 250 миллисекунд предотвращает лишние запросы при быстром наборе текста.

Состояние приложения хранится в Zustand-store:

```ts
export const useNormalizationStore = create<NormalizationState>((set, get) => ({
  source: sampleText,
  result: "",
  changes: [],
  options: defaultOptions,
  fileName: "",
  isLoading: false,
  error: "",
  showChanges: true,
  stats: getStats([]),
  ...
}));
```

В store также считается статистика изменений:

```ts
function getStats(changes: Change[]): NormalizationStats {
  return {
    total: changes.length,
    replace: changes.filter((change) => change.type === "replace").length,
    insert: changes.filter((change) => change.type === "insert").length,
    remove: changes.filter((change) => change.type === "delete").length,
  };
}
```

Чтобы старый ответ API не перезаписал более новый ввод, используется счетчик запросов:

```ts
let normalizationRequestId = 0;

function invalidateNormalizationRequest() {
  normalizationRequestId += 1;
}
```

При каждом запросе сохраняется локальный `requestId`, а после ответа проверяется, является ли он актуальным.

## 12. Клиент API

Frontend обращается к backend через общий `apiClient`. Для обычного текста используется JSON-запрос:

```ts
export async function normalizeText(
  text: string,
  options: NormalizationOptions,
): Promise<NormalizeResponse> {
  try {
    const response = await apiClient.post<NormalizeResponse>("/api/normalize", {
      text,
      options,
    });

    return response.data;
  } catch (error) {
    throw new Error(extractError(error) ?? "Не удалось выполнить нормализацию");
  }
}
```

Для файлов используется `FormData`, куда помещается файл и JSON-строка с настройками:

```ts
export async function normalizeFile(
  file: File,
  options: NormalizationOptions,
): Promise<NormalizeResponse> {
  const body = new FormData();
  body.append("file", file);
  body.append("options_json", JSON.stringify(options));

  try {
    const response = await apiClient.post<NormalizeResponse>("/api/normalize-file", body);
    return response.data;
  } catch (error) {
    throw new Error(extractError(error) ?? "Не удалось выполнить нормализацию файла");
  }
}
```

## 13. Подсветка изменений

Компонент `HighlightedText` получает нормализованный текст и массив изменений. Он проходит по изменениям в порядке позиции `dst_start`, выводит неизмененные фрагменты обычным текстом, а измененные фрагменты оборачивает в специальные элементы.

```tsx
const orderedChanges = [...changes].sort((a, b) => a.dst_start - b.dst_start);
const nodes: React.ReactNode[] = [];
let cursor = 0;

orderedChanges.forEach((change, index) => {
  if (change.dst_start > cursor) {
    nodes.push(
      <span key={`plain-${index}`}>
        {visibleText(text.slice(cursor, change.dst_start))}
      </span>,
    );
  }

  if (change.type === "delete") {
    nodes.push(
      <span
        className={changeClasses.delete}
        key={`change-${index}`}
        title={`Удалено: ${change.src_text}`}
      >
        ×
      </span>,
    );
    cursor = change.dst_end;
    return;
  }

  nodes.push(
    <span
      className={changeClasses[change.type]}
      key={`change-${index}`}
      title={`${change.src_text || "∅"} → ${change.dst_text || "∅"}`}
    >
      {visibleText(text.slice(change.dst_start, change.dst_end) || change.dst_text)}
    </span>,
  );
  cursor = change.dst_end;
});
```

Удаления показываются отдельным маркером, потому что удаленный символ отсутствует в итоговой строке. Замены и вставки подсвечиваются в самом тексте. Для ZWNJ используется отображение через видимый текстовый фрагмент, чтобы пользователь понимал, где был добавлен разделитель.

## 14. Панель настроек

Панель настроек строится на основе массива `optionsMeta`. Это позволяет не дублировать описание правил в разных частях интерфейса:

```ts
export const optionsMeta: OptionMeta[] = [
  {
    key: "remove_tatweel",
    label: "Удалять татвил",
    description: "Убирает elongation-символ ـ.",
    default: false,
  },
  {
    key: "normalize_kaf_yay",
    label: "Kaf / Yay",
    description: "Приводит варианты ک, ی, ى и похожие символы к канону.",
    default: true,
  },
  ...
];
```

В компоненте `NormalizationSettings` каждый пункт превращается в переключатель:

```tsx
{optionsMeta.map((option) => {
  const Icon = optionIcons[option.key];

  return (
    <label className={optionTool} key={option.key}>
      <span className={toolLabel}>
        <Icon className="flex-none text-[#6f747a]" size={16} />
        <span className="min-w-0 truncate">{option.label}</span>
      </span>
      <input
        checked={options[option.key]}
        type="checkbox"
        onChange={(event) =>
          setOption(option.key, event.target.checked)
        }
      />
    </label>
  );
})}
```

## 15. Пользовательский сценарий

Типовой сценарий работы:

1. Пользователь открывает страницу `/ramz`.
2. Вставляет арабографичный текст или загружает `.txt`-файл.
3. Выбирает правила нормализации в правой панели.
4. Frontend отправляет текст и настройки в `ramz-service`.
5. Backend применяет правила RAMZ и возвращает `text` + `changes`.
6. Frontend показывает нормализованный текст и подсвечивает изменения.
7. Пользователь копирует, скачивает или использует результат дальше.

## 16. Запуск

Запуск всей системы через Docker Compose:

```bash
docker compose up --build
```

После запуска:

- основной сервис Qalam доступен на `/`;
- сервис Chagatai RAMZ доступен на `/ramz`;
- API нормализации проксируется через `/api/ramz/`.

Локальный запуск backend:

```bash
cd services/ramz-service
pip install -r requirements.txt
uvicorn main:app --reload
```

Локальный запуск frontend:

```bash
cd frontend/ramz
npm install
npm run dev
```

## 17. Значимые результаты разработки

В рамках сервиса реализованы следующие программные решения:

- модульная архитектура, разделяющая frontend `chagatai-ramz` и backend `ramz-service`;
- настраиваемый pipeline нормализации арабографичного текста;
- таблицы канонизации буквенных вариантов kaf, yay, heh и teh marbuta;
- преобразование персидских цифр в восточно-арабские;
- очистка невидимых Unicode-символов и опциональное удаление диакритики;
- алгоритм добавления ZWNJ для предотвращения нежелательного соединения форм;
- графемно-ориентированное сравнение исходного и нормализованного текста;
- формирование структурированного списка изменений с координатами и причинами;
- frontend-подсветка замен, вставок и удалений;
- поддержка нормализации загруженных UTF-8 `.txt`-файлов;
- контейнеризация и маршрутизация через Docker Compose и nginx.

Эти элементы образуют единый программный комплекс для нормализации, проверки и объяснимого редактирования чагатайских арабографичных текстов.
