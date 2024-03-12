import uvicorn

if __name__ == "__main__":
    uvicorn.run("app:app", host="localhost", port=9999, reload=True, log_config="uvicorn_loggin_config.json")
