# Organizador de Partituras

Separe um PDF grande em arquivos menores, um por instrumento ou trecho. Tudo no navegador — o arquivo não sai do computador. O passo a passo está no ícone de ajuda no app.

## Desenvolvimento

Node.js 22+.

```bash
pnpm install
pnpm dev
```

[http://localhost:3000](http://localhost:3000)

## Docker

```bash
docker build -t organizador-partituras .
docker run -p 80:80 organizador-partituras
```

Build Vite em imagem Node, servido pelo nginx na porta 80 (`nginx.conf`).
