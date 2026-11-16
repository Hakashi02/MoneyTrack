
document.addEventListener("DOMContentLoaded", () => {
  const login = document.getElementById("tabLogin");
  const cadastro = document.getElementById("tabCadastro");
  const footerToggle = document.getElementById("footerToggle");

  const nome = document.getElementById("nomeWrap");
  const confirmar = document.getElementById("confirmarSenhaWrap");

  const nomeInput = document.getElementById("nomeConta");
  const confirmarInput = document.getElementById("confirmarSenha");

  const botao = document.getElementById("authSubmit");
  const mensagem = document.getElementById("authMessage");
  const textoRodape = document.getElementById("authFooterText");

  function trocarModo(modo) {
    const criarConta = modo === "cadastro";

    nome.classList.toggle("hidden", !criarConta);
    confirmar.classList.toggle("hidden", !criarConta);

    login.classList.toggle("active", !criarConta);
    cadastro.classList.toggle("active", criarConta);

    nomeInput.required = criarConta;
    confirmarInput.required = criarConta;

    botao.textContent = criarConta
      ? "Criar minha conta"
      : "Entrar na minha conta";

    textoRodape.textContent = criarConta
      ? "Já tem uma conta?"
      : "Ainda não tem uma conta?";

    footerToggle.textContent = criarConta
      ? "Entrar"
      : "Criar conta";

    mensagem.textContent = "";
  }

  login.addEventListener("click", () => {
    trocarModo("login");
  });

  cadastro.addEventListener("click", () => {
    trocarModo("cadastro");
  });

  footerToggle.addEventListener("click", () => {
    const modoAtual = footerToggle.textContent.trim();

    if (modoAtual === "Entrar") {
      trocarModo("login");
    } else {
      trocarModo("cadastro");
    }
  });

  trocarModo("login");
});
