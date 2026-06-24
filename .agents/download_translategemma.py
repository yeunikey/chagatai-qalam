from huggingface_hub import snapshot_download
from main import TRANSLATEGEMMA_BASE_REPO, HF_TOKEN
path = snapshot_download(repo_id=TRANSLATEGEMMA_BASE_REPO, token=HF_TOKEN)
print(path)
