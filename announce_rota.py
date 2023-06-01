import subprocess

def announce_rota():
    # Call the JavaScript code to manually announce the rota
    subprocess.run(["node", "./app.js"])

if __name__ == "__main__":
    announce_rota()

