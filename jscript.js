
document.addEventListener("DOMContentLoaded", () => {
  // ========================================
  // 1. CONEXÃO COM O SUPABASE
  // ========================================

  if (!window.supabase || !window.MONEYTRACK_CONFIG) {
    alert("Erro na configuração do Supabase. Verifique o Config.js.");
    return;
  }

  const supabase = window.supabase.createClient(
    window.MONEYTRACK_CONFIG.SUPABASE_URL,
    window.MONEYTRACK_CONFIG.SUPABASE_ANON_KEY
  );

  // ========================================
  // 2. ELEMENTOS DO HTML
  // ========================================

  const authView = document.getElementById("authView");
  const appView = document.getElementById("appView");
  const adminView = document.getElementById("adminView");

  const login = document.getElementById("tabLogin");
  const cadastro = document.getElementById("tabCadastro");
  const footerToggle = document.getElementById("footerToggle");

  const nome = document.getElementById("nomeWrap");
  const confirmar = document.getElementById("confirmarSenhaWrap");

  const nomeInput = document.getElementById("nomeConta");
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const confirmarInput = document.getElementById("confirmarSenha");

  const form = document.getElementById("authForm");
  const botao = document.getElementById("authSubmit");
  const mensagem = document.getElementById("authMessage");
  const textoRodape = document.getElementById("authFooterText");

  // Identificação dos campos para o navegador
  nomeInput.name = "name";
  emailInput.name = "email";
  senhaInput.name = "password";
  confirmarInput.name = "confirm-password";

  // ========================================
  // 3. CONTROLE DAS TELAS
  // ========================================

  function mostrarTela(tela) {
    authView.classList.toggle("hidden", tela !== "auth");
    appView.classList.toggle("hidden", tela !== "app");
    adminView.classList.toggle("hidden", tela !== "admin");
  }

  function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.style.color = erro ? "#ff7070" : "#7ee0a1";
  }

  // ========================================
  // 4. ALTERNAR LOGIN E CADASTRO
  // ========================================

  let modoAtual = "login";

  function trocarModo(modo) {
    const criarConta = modo === "cadastro";
    modoAtual = modo;

    nome.classList.toggle("hidden", !criarConta);
    confirmar.classList.toggle("hidden", !criarConta);

    login.classList.toggle("active", !criarConta);
    cadastro.classList.toggle("active", criarConta);

    nomeInput.required = criarConta;
    confirmarInput.required = criarConta;

    // Orienta o preenchimento automático do navegador
    emailInput.autocomplete = "username";

    senhaInput.autocomplete = criarConta
      ? "new-password"
      : "current-password";

    confirmarInput.autocomplete = "new-password";

    botao.textContent = criarConta
      ? "Criar minha conta"
      : "Entrar na minha conta";

    textoRodape.textContent = criarConta
      ? "Já tem uma conta?"
      : "Ainda não tem uma conta?";

    footerToggle.textContent = criarConta
      ? "Entrar"
      : "Criar conta";

    // Evita carregar a senha de login na tela de cadastro
    senhaInput.value = "";
    confirmarInput.value = "";

    mostrarMensagem("");
  }

  login.addEventListener("click", () => {
    trocarModo("login");
  });

  cadastro.addEventListener("click", () => {
    trocarModo("cadastro");
  });

  footerToggle.addEventListener("click", () => {
    trocarModo(modoAtual === "login" ? "cadastro" : "login");
  });

  // ========================================
  // 5. VERIFICAR USUÁRIO E ADMINISTRADOR
  // ========================================

  async function verificarSessao(session) {
    if (!session || !session.user) {
      mostrarTela("auth");
      return;
    }

    const usuario = session.user;

    const nomeUsuario =
      usuario.user_metadata?.full_name ||
      usuario.email;

    try {
      const { data: administrador, error } =
        await supabase.rpc("is_moneytrack_admin");

      if (error) {
        console.error("Erro ao verificar administrador:", error);
      }

      if (!error && administrador === true) {
        document.getElementById("adminLabel").textContent =
          nomeUsuario;

        document.getElementById("adminListaUsuarios").textContent =
          "Acesso administrativo confirmado. A listagem de usuários ainda precisa ser configurada.";

        mostrarTela("admin");
        return;
      }

      document.getElementById("userLabel").textContent =
        nomeUsuario;

      mostrarTela("app");

    } catch (erro) {
      console.error("Erro ao abrir painel:", erro);

      document.getElementById("userLabel").textContent =
        nomeUsuario;

      mostrarTela("app");
    }
  }

  // ========================================
  // 6. LOGIN E CADASTRO
  // ========================================

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
      mostrarMensagem("Preencha o e-mail e a senha.", true);
      return;
    }

    botao.disabled = true;
    mostrarMensagem("Aguarde...");

    try {
      if (modoAtual === "cadastro") {
        const nomeCompleto = nomeInput.value.trim();
        const confirmarSenha = confirmarInput.value;

        if (!nomeCompleto) {
          mostrarMensagem("Digite seu nome completo.", true);
          return;
        }

        if (senha.length < 6) {
          mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.", true);
          return;
        }

        if (senha !== confirmarSenha) {
          mostrarMensagem("As senhas não são iguais.", true);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              full_name: nomeCompleto
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          await verificarSessao(data.session);
        } else {
          mostrarMensagem(
            "Cadastro realizado! Confira seu e-mail para confirmar a conta."
          );
        }

      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password: senha
          });

        if (error) throw error;

        await verificarSessao(data.session);
      }

    } catch (erro) {
      console.error("Erro de autenticação:", erro);

      mostrarMensagem(
        erro.message || "Não foi possível realizar a operação.",
        true
      );

    } finally {
      botao.disabled = false;
    }
  });

  // ========================================
  // 7. LOGIN COM GOOGLE E APPLE
  // ========================================

  async function loginSocial(provedor) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provedor,
        options: {
          redirectTo: window.location.origin +
            window.location.pathname
        }
      });

      if (error) throw error;

    } catch (erro) {
      mostrarMensagem(
        "Não foi possível entrar com " +
        provedor +
        ". Verifique a configuração do provedor no Supabase.",
        true
      );
    }
  }

  document.getElementById("googleLogin").addEventListener("click", () => {
    loginSocial("google");
  });

  document.getElementById("appleLogin").addEventListener("click", () => {
    loginSocial("apple");
  });

  // ========================================
  // 8. SAIR DA CONTA
  // ========================================

  async function sair() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Não foi possível sair da conta.");
      return;
    }

    senhaInput.value = "";
    confirmarInput.value = "";

    mostrarTela("auth");
    trocarModo("login");
  }

  document.getElementById("logoutBtn").addEventListener("click", sair);
  document.getElementById("adminLogoutBtn").addEventListener("click", sair);

  // ========================================
  // 9. RESTAURAR SESSÃO AO ABRIR O SITE
  // ========================================

  supabase.auth.onAuthStateChange((evento, session) => {
    setTimeout(() => {
      verificarSessao(session);
    }, 0);
  });

  async function iniciar() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      mostrarTela("auth");
      mostrarMensagem("Erro ao verificar sua sessão.", true);
      return;
    }

    await verificarSessao(data.session);
  }

  trocarModo("login");
  iniciar();
});
