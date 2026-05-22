import json
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from keyboard.keyboard import ChagataiKeyboard
from proto_codec import decode_predict_request, encode_predict_response

app = FastAPI(title="Qalam Next Token Prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
kb = ChagataiKeyboard()


class PredictRequest(BaseModel):
    text: str
    top_k: Optional[int] = 5


class SuggestionItem(BaseModel):
    word: str
    score: float
    source: str


class PredictResponse(BaseModel):
    input_text: str
    suggestions: list[SuggestionItem]


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    suggestions = kb.suggest_full(request.text, request.top_k)
    return PredictResponse(
        input_text=request.text,
        suggestions=[
            SuggestionItem(word=s.word, score=s.score, source=s.source)
            for s in suggestions
        ],
    )


@app.websocket("/ws/predict")
@app.websocket("/ws/predict/")
async def predict_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive()
            response_payload = b""

            if message.get("bytes") is not None:
                text, top_k = decode_predict_request(message["bytes"])
                request = PredictRequest(text=text, top_k=top_k)
            elif message.get("text") is not None:
                body = json.loads(message["text"])
                request = PredictRequest(
                    text=str(body.get("text", "")),
                    top_k=int(body.get("top_k", 5)),
                )
            else:
                continue

            if not request.text.strip():
                response_payload = encode_predict_response(
                    input_text=request.text,
                    suggestions=[],
                    error="Empty input text",
                )
            else:
                suggestions = kb.suggest_full(request.text, request.top_k)
                response_payload = encode_predict_response(
                    input_text=request.text,
                    suggestions=[(s.word, s.score, s.source) for s in suggestions],
                )

            await websocket.send_bytes(response_payload)
    except (WebSocketDisconnect, RuntimeError):
        return


@app.get("/health")
def health():
    return {"status": "ok"}
