(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "moneytrack_painel_v2";

  const money = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const number = (value) => {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const today = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  };

  const uid = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const emptyData = () => ({
    salary: 0,
    creditLimit: 0,
    expenses: [],
    products: []
  });

  function normalizeProduct(product) {
    const count = Math.max(
      1,
      Math.floor(Number(product.count ?? product.quantidade) || 1)
    );

    let paidInstallments;

    if (Array.isArray(product.paidInstallments)) {
      paidInstallments = Array.from(
        { length: count },
        (_, index) => Boolean(product.paidInstallments[index])
      );
    } else {
      const oldPaidCount = Math.min(
        count,
        Math.max(0, Math.floor(Number(product.paidCount ?? product.pagas) || 0))
      );

      paidInstallments = Array.from(
        { length: count },
        (_, index) => index < oldPaidCount
      );
    }

    return { ...product, count, paidInstallments };
  }

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

      if (saved && typeof saved === "object") {
        return {
          salary: number(saved.salary ?? saved.salario),
          creditLimit: number(saved.creditLimit ?? saved.limiteCredito),
          expenses: Array.isArray(saved.expenses)
            ? saved.expenses
            : (Array.isArray(saved.despesas) ? saved.despesas : []),
          products: (Array.isArray(saved.products)
            ? saved.products
            : (Array.isArray(saved.produtos) ? saved.produtos : [])
          ).map(normalizeProduct)
        };
      }
    } catch (error) {
      console.warn("Não foi possível ler os dados salvos:", error);
    }

    return emptyData();
  }

  let data = loadData();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      alert("Não foi possível salvar os dados neste navegador.");
      console.error(error);
    }

    render();
  }

  // Divide os centavos para que a soma de todas as parcelas seja exata.
  function installmentAmounts(product) {
    const count = Math.max(
      1,
      Math.floor(Number(product.count ?? product.quantidade) || 1)
    );

    const totalCents = Math.max(
      0,
      Math.round(number(product.totalValue ?? product.valorTotal) * 100)
    );

    const base = Math.floor(totalCents / count);
    const remainder = totalCents % count;

    return Array.from(
      { length: count },
      (_, index) => (base + (index < remainder ? 1 : 0)) / 100
    );
  }

  // Calcula a data de cada mês sem deixar o dia ultrapassar o último dia do mês.
  function installmentDate(firstDate, index) {
    if (!firstDate) return "";

    const [year, month, day] = firstDate.split("-").map(Number);
    const targetMonth = new Date(year, month - 1 + index, 1);
    const lastDay = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0
    ).getDate();

    targetMonth.setDate(Math.min(day || 1, lastDay));

    const y = targetMonth.getFullYear();
    const m = String(targetMonth.getMonth() + 1).padStart(2, "0");
    const d = String(targetMonth.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function formatDate(dateString) {
    if (!dateString) return "Sem data";

    return new Date(`${dateString}T12:00:00`).toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    );
  }

  function productPaidAmount(product) {
    const amounts = installmentAmounts(product);
    const statuses = product.paidInstallments || [];

    return amounts.reduce(
      (sum, amount, index) => sum + (statuses[index] ? amount : 0),
      0
    );
  }

  function productCreditUsed(product) {
    const total = number(product.totalValue ?? product.valorTotal);

    return Math.max(
      0,
      Math.round((total - productPaidAmount(product)) * 100) / 100
    );
  }

  function totalCreditUsed() {
    return data.products.reduce(
      (sum, product) => sum + productCreditUsed(product),
      0
    );
  }

  function monthKey(dateString) {
    return String(dateString || "").slice(0, 7);
  }

  // Somente despesas comuns entram no cálculo da renda mensal.
  // Parcelamentos são controlados separadamente no limite de crédito.
  function currentMonthExpenses() {
    const month = monthKey(today());

    return data.expenses
      .filter(item => monthKey(item.date || item.data) === month)
      .reduce(
        (sum, item) => sum + number(item.amount ?? item.valor),
        0
      );
  }

  function setText(id, value) {
    if ($(id)) $(id).textContent = value;
  }

  function updateChart(expenses, balance) {
    const chart = $("graficoFinanceiro");
    if (!chart) return;

    const salary = Math.max(0, data.salary);
    const spent = Math.max(0, expenses);

    if (salary <= 0) {
      chart.style.background = "#334155";
    } else {
      const spentPercent = Math.min(100, spent / salary * 100);

      chart.style.background = `
        conic-gradient(
          #f97316 0% ${spentPercent}%,
          #22c55e ${spentPercent}% 100%
        )
      `;
    }

    setText("graficoSaldo", money(balance));
    setText("legendaSalario", money(salary));
    setText("legendaDespesas", money(spent));
    setText("legendaSaldo", money(balance));
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;

    return node;
  }

  function renderCredit() {
    const used = totalCreditUsed();
    const available = data.creditLimit - used;

    const safeAvailable = Math.max(0, available);
    const chart = $("graficoCredito");

    setText("limiteCreditoAtual", money(data.creditLimit));
    setText("creditoUtilizado", money(used));
    setText("creditoDisponivel", money(safeAvailable));

    setText("graficoCreditoSaldo", money(safeAvailable));
    setText("legendaCreditoUtilizado", money(used));
    setText("legendaCreditoDisponivel", money(safeAvailable));

    if (chart) {
      if (data.creditLimit <= 0) {
        chart.style.background = "#334155";
      } else {
        const usedPercent = Math.min(
          100,
          used / data.creditLimit * 100
        );

        chart.style.background = `
          conic-gradient(
            #f97316 0% ${usedPercent}%,
            #22c55e ${usedPercent}% 100%
          )
        `;
      }
    }

    const availableNode = $("creditoDisponivel");

    if (availableNode) {
      availableNode.style.color =
        available < 0 ? "#f87171" : "#4ade80";
    }

    setText(
      "avisoLimiteCredito",
      available < 0
        ? `Atenção: suas compras ultrapassaram o limite de crédito disponível em ${money(Math.abs(available))}.`
        : ""
    );
  }

  function renderExpenses() {
    const list = $("listaDespesas");
    if (!list) return;

    list.replaceChildren();

    if (!data.expenses.length) {
      list.append(element("p", "empty-message", "Nenhuma despesa cadastrada."));
      return;
    }

    [...data.expenses]
      .sort((a, b) =>
        String(b.date || b.data).localeCompare(String(a.date || a.data))
      )
      .forEach(item => {
        const row = element("article", "finance-item");
        const info = element("div");

        info.append(
          element("h3", "", item.name || item.nome || "Despesa"),
          element("p", "", formatDate(item.date || item.data)),
          element(
            "p",
            item.paid ? "pago" : "valor",
            `${money(item.amount ?? item.valor)} · ${item.paid ? "Paga" : "Pendente"}`
          )
        );

        const actions = element("div", "item-actions");

        const toggle = element(
          "button",
          item.paid ? "btn-neutral" : "btn-paid",
          item.paid ? "Desfazer pagamento" : "Marcar como paga"
        );

        toggle.type = "button";
        toggle.addEventListener("click", () => {
          item.paid = !item.paid;
          persist();
        });

        const remove = element("button", "btn-delete", "Excluir");
        remove.type = "button";
        remove.addEventListener("click", () => {
          if (!confirm("Excluir esta despesa?")) return;

          data.expenses = data.expenses.filter(entry => entry.id !== item.id);
          persist();
        });

        actions.append(toggle, remove);
        row.append(info, actions);
        list.append(row);
      });
  }

  function renderProducts() {
    const list = $("listaParcelas");
    if (!list) return;

    list.replaceChildren();

    if (!data.products.length) {
      list.append(
        element("p", "empty-message", "Nenhum produto parcelado cadastrado.")
      );
      return;
    }

    data.products.forEach(product => {
      // Garante compatibilidade com compras antigas sem perder os pagamentos.
      if (!Array.isArray(product.paidInstallments)) {
        product.paidInstallments = normalizeProduct(product).paidInstallments;
      }

      const amounts = installmentAmounts(product);
      const statuses = product.paidInstallments;
      const paidCount = statuses.filter(Boolean).length;
      const remainingCount = amounts.length - paidCount;
      const totalPaid = productPaidAmount(product);
      const creditUsed = productCreditUsed(product);
      const firstDate = product.firstDate || product.dataInicial;
      const totalValue = amounts.reduce((sum, amount) => sum + amount, 0);

      const card = element("article", "installment-card");

      card.append(
        element("h3", "", product.name || product.nome || "Compra"),
        element("p", "", `Valor da compra: ${money(totalValue)}`),
        element(
          "p",
          "",
          `${paidCount} de ${amounts.length} parcelas pagas · faltam ${remainingCount}`
        )
      );

      const progress = element("div", "installment-progress");
      const fill = element("span");
      fill.style.width = `${paidCount / amounts.length * 100}%`;
      progress.append(fill);

      card.append(
        progress,
        element(
          "p",
          "",
          `Já pago: ${money(totalPaid)} · Falta pagar: ${money(creditUsed)}`
        ),
        element(
          "p",
          "credit-product-info",
          `Crédito comprometido nesta compra: ${money(creditUsed)}`
        )
      );

      const installmentList = element("div", "individual-installments");

      amounts.forEach((amount, index) => {
        const dueDate = installmentDate(firstDate, index);
        const isPaid = statuses[index];

        const installmentRow = element(
          "div",
          `individual-installment${isPaid ? " installment-is-paid" : ""}`
        );

        const details = element("div", "individual-installment-details");

        details.append(
          element("strong", "", `${index + 1}ª parcela · ${money(amount)}`),
          element(
            "span",
            "",
            `${formatDate(dueDate)} · ${isPaid ? "Paga" : "Pendente"}`
          )
        );

        const toggle = element(
          "button",
          isPaid ? "btn-neutral" : "btn-paid",
          isPaid ? "Desfazer pagamento" : "Pagar parcela"
        );

        toggle.type = "button";
        toggle.addEventListener("click", () => {
          const action = isPaid
            ? "desfazer o pagamento"
            : (index === 0 || statuses.slice(0, index).every(Boolean)
                ? "marcar esta parcela como paga"
                : "antecipar esta parcela");

          if (!confirm(`Confirma ${action} de ${money(amount)} (${index + 1}ª parcela)?`)) {
            return;
          }

          product.paidInstallments[index] = !product.paidInstallments[index];
          persist();
        });

        installmentRow.append(details, toggle);
        installmentList.append(installmentRow);
      });

      card.append(installmentList);

      const remove = element("button", "btn-delete", "Excluir produto");
      remove.type = "button";
      remove.addEventListener("click", () => {
        if (!confirm("Excluir este parcelamento? O crédito comprometido será liberado.")) {
          return;
        }

        data.products = data.products.filter(entry => entry.id !== product.id);
        persist();
      });

      const actions = element("div", "installment-actions");
      actions.append(remove);
      card.append(actions);
      list.append(card);
    });
  }

  function renderForecast() {
    const list = $("listaPrevisao");
    if (!list) return;

    list.replaceChildren();

    const expenses = currentMonthExpenses();
    const balance = data.salary - expenses;

    [
      ["Renda mensal", money(data.salary)],
      ["Despesas previstas", money(expenses)],
      ["Saldo previsto", money(balance)]
    ].forEach(([label, value]) => {
      const card = element("div", "forecast-card");
      card.append(
        element("span", "", label),
        element("strong", "", value)
      );
      list.append(card);
    });
  }

  function render() {
    const expenses = currentMonthExpenses();
    const balance = data.salary - expenses;

    setText("valorSalario", money(data.salary));
    setText("totalPago", money(data.salary));
    setText("totalPendente", money(expenses));
    setText("saldoRestante", money(balance));

    if ($("saldoRestante")) {
      $("saldoRestante").style.color =
        balance < 0 ? "#f87171" : "#4ade80";
    }

    updateChart(expenses, balance);
    renderCredit();
    renderExpenses();
    renderProducts();
    renderForecast();
  }

  function setupTabs() {
    document.querySelectorAll(".dashboard-nav [data-tab]")
      .forEach(button => {
        button.addEventListener("click", () => {
          document.querySelectorAll(".dashboard-panel")
            .forEach(panel => {
              panel.classList.toggle(
                "hidden",
                panel.id !== button.dataset.tab
              );
            });

          document.querySelectorAll(".dashboard-nav button")
            .forEach(tab => {
              tab.classList.toggle("active", tab === button);
            });
        });
      });
  }

  function setupForms() {
    $("salaryForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const salary = number($("salario").value);

      if (salary <= 0) {
        alert("Digite uma renda maior que zero.");
        return;
      }

      data.salary = salary;
      persist();
    });

    $("creditLimitForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const limit = number($("limiteCredito").value);

      if (limit < 0) {
        alert("Digite um limite válido.");
        return;
      }

      data.creditLimit = limit;
      persist();
    });

    $("expenseForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const name = $("nomeDespesa").value.trim();
      const amount = number($("valorDespesa").value);
      const date = $("dataDespesa").value || today();

      if (!name || amount <= 0) {
        alert("Informe o nome e um valor válido para a despesa.");
        return;
      }

      data.expenses.push({
        id: uid(),
        name,
        amount,
        date,
        paid: false
      });

      $("expenseForm").reset();
      $("dataDespesa").value = today();
      persist();
    });

    const totalInput = $("valorTotalProduto");
    const countInput = $("quantidadeParcelas");
    const installmentInput = $("valorParcela");

    const calculate = () => {
      const total = number(totalInput?.value);
      const count = Math.floor(number(countInput?.value));

      if (total > 0 && count > 0) {
        installmentInput.value =
          (Math.round(total / count * 100) / 100).toFixed(2);
      } else {
        installmentInput.value = "";
      }
    };

    totalInput?.addEventListener("input", calculate);
    countInput?.addEventListener("input", calculate);

    $("installmentForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const name = $("nomeParcela").value.trim();
      const totalValue = number(totalInput.value);
      const count = Math.floor(number(countInput.value));
      const firstDate = $("dataPrimeiraParcela").value || today();

      if (!name || totalValue <= 0 || count < 1 || count > 120) {
        alert("Confira os dados do parcelamento.");
        return;
      }

      const available = data.creditLimit - totalCreditUsed();

      if (data.creditLimit <= 0) {
        alert("Cadastre primeiro seu limite de crédito.");
        return;
      }

      if (totalValue > available + 0.001) {
        alert(
          `Compra não cadastrada. Crédito disponível: ${money(Math.max(0, available))}.`
        );
        return;
      }

      data.products.push({
        id: uid(),
        name,
        totalValue: Math.round(totalValue * 100) / 100,
        count,
        installmentValue: Math.round(totalValue / count * 100) / 100,
        firstDate,
        paidCount: 0,
        paidInstallments: Array(count).fill(false)
      });

      $("installmentForm").reset();
      $("dataPrimeiraParcela").value = today();
      calculate();
      persist();
    });

    $("logoutBtn")?.addEventListener("click", () => {
      alert(
        "Este painel independente não está conectado a uma sessão de login. Para sair, feche esta página."
      );
    });
  }

  function init() {
    if ($("salario")) $("salario").value = data.salary || "";
    if ($("limiteCredito")) $("limiteCredito").value = data.creditLimit || "";
    if ($("dataDespesa")) $("dataDespesa").value = today();
    if ($("dataPrimeiraParcela")) $("dataPrimeiraParcela").value = today();

    setupTabs();
    setupForms();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();