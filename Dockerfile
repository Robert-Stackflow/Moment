FROM node:22-alpine AS frontend
WORKDIR /build
COPY web/package*.json ./web/
COPY admin/package*.json ./admin/
RUN npm --prefix web ci && npm --prefix admin ci
COPY web ./web
COPY admin ./admin
COPY shared ./shared
RUN npm --prefix web run build && npm --prefix admin run build

FROM golang:1.24-alpine AS backend
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /moment ./cmd/moment

FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend /moment ./moment
COPY --from=frontend /build/dist ./dist
ENV TZ=Asia/Shanghai MOMENT_DATA_DIR=/app/data
EXPOSE 9999
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -q -O /dev/null http://127.0.0.1:9999/healthz || exit 1
CMD ["./moment"]
