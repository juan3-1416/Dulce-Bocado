FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN python -m pip install --no-cache-dir --timeout 60 --retries 3 --index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple -r requirements.txt

COPY etl.py ./etl.py
COPY transformaciones.py ./transformaciones.py

CMD ["python", "/app/etl.py"]
