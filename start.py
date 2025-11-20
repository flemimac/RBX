import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def run_process(cmd: list[str], cwd: Path | None = None, shell: bool = False) -> subprocess.Popen:
    return subprocess.Popen(cmd, cwd=cwd, shell=shell)


def main() -> None:
    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
    ]
    
    frontend_cmd = ["npm", "run", "dev"]

    processes: list[subprocess.Popen] = []
    try:
        processes.append(run_process(backend_cmd, cwd=BACKEND_DIR))
        time.sleep(2)
        
        is_windows = sys.platform == "win32"
        processes.append(run_process(frontend_cmd, cwd=FRONTEND_DIR, shell=is_windows))
        time.sleep(3)
        
        webbrowser.open("http://localhost:3000")

        while all(p.poll() is None for p in processes):
            time.sleep(1)

    except KeyboardInterrupt:
        pass
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
