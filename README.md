# Onze Feminino

Resultados, jogos e classificações do futebol feminino em Portugal (Liga BPI, 2.ª, 3.ª e 4.ª Liga).

## Correr
```
set ADMIN_PASSWORD=escolhe-uma
node server.js
```
Abre `http://localhost:3000`. Não tem dependências, só precisa de Node.

## Estrutura
- `public/`: a app (HTML, CSS e JS).
- `data/data.json`: competições, equipas, jogos e classificações.
- `public/clubes`, `public/ligas`, `public/fotos`: emblemas e fotos. A origem de cada imagem está em `public/creditos.json`.

## Dados
Lidos à mão a partir de fontes públicas (Flashscore, publicações de clubes e da 2.ª Liga no Instagram) e verificados antes de gravar.
