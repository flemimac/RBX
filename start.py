import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend" / "src"


def run_process(cmd: list[str], cwd: Path | None = None) -> subprocess.Popen:
    return subprocess.Popen(cmd, cwd=cwd)


def main() -> None:
    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
    ]
    frontend_cmd = [
        sys.executable,
        "-m",
        "http.server",
        "5173",
        "--directory",
        str(FRONTEND_DIR),
    ]

    processes: list[subprocess.Popen] = []
    try:
        processes.append(run_process(backend_cmd, cwd=BACKEND_DIR))
        time.sleep(2)
        processes.append(run_process(frontend_cmd, cwd=ROOT))
        time.sleep(2)
        webbrowser.open("http://127.0.0.1:5173")

        while all(p.poll() is None for p in processes):
            time.sleep(1)

    except KeyboardInterrupt:
        print("End process...")
    finally:
        for proc in processes:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()


if __name__ == "__main__":
    main()


