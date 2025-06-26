FROM python:3.9.5-slim-buster

COPY . /app

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo 'Asia/Shanghai' >/etc/timezone

WORKDIR /app

RUN pip install -r requirements.txt

EXPOSE 80

CMD ["python", "main.py"]