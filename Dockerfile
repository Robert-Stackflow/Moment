FROM python:3.11.13-slim

COPY . /app

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo 'Asia/Shanghai' >/etc/timezone

WORKDIR /app

RUN pip install -r requirements.txt

EXPOSE 9999

CMD ["python", "run.py"]