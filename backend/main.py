from fastapi import FastAPI
from pydantic import BaseModel # likely we'lluse this later

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
