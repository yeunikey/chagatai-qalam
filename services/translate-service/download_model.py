from huggingface_hub import snapshot_download

from main import HF_TOKEN, TRANSLATEGEMMA_BASE_REPO


if __name__ == "__main__":
    print(snapshot_download(repo_id=TRANSLATEGEMMA_BASE_REPO, token=HF_TOKEN))
