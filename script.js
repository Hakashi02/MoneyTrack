
let entradas = Number(localStorage.getItem("entradas")) || 0;
let despesas = Number(localStorage.getItem("despesas")) || 0;

function adicionarMovimentacao() {
    const descricao = document.getElementById("descricao").value;
    const valorTexto = document.getElementById("valor").value.trim().replace(",", ".");
    const valor = Number(valorTexto);
    const tipo = document.getElementById("tipo").value;

    if (
        descricao.trim() === "" ||
        valorTexto === "" ||
        !Number.isFinite(valor) ||
        valor <= 0
    ) {
        alert("Preencha a descrição e um valor válido!");
        return;
    }

    if (tipo === "entrada") {
        entradas += valor;
    } else {
        despesas += valor;
    }

    salvarDados();
    atualizarPainel();

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
}

function salvarDados() {
    localStorage.setItem("entradas", entradas);
    localStorage.setItem("despesas", despesas);
}

function atualizarPainel() {
    const saldo = entradas - despesas;
    const cartoes = document.querySelectorAll(".card p");

    cartoes[0].textContent = saldo.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    cartoes[1].textContent = entradas.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    cartoes[2].textContent = despesas.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

atualizarPainel();
