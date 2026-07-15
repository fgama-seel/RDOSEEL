name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main # ou master, dependendo do nome da sua branch principal

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout 🛎️
        uses: actions/checkout@v4

      - name: Setup Node.js ⚙️
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Dependencies 🔧
        run: |
          rm -f package-lock.json
          npm install

      - name: Build App 🏗️
        run: npm run build

      - name: Deploy to GitHub Pages 🚀
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist # Pasta que o Vite gera com os arquivos compilados
          branch: gh-pages # Branch onde os arquivos compilados serão enviados
