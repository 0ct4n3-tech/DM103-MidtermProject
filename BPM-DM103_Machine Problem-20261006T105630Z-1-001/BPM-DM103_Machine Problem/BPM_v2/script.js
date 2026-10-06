const MENU = [
  ["Chicken Meal", 120],
  ["Burger Meal", 95],
  ["Spaghetti", 80],
  ["Fried Rice Meal", 110],
  ["Pork Sisig", 150],
  ["Halo-Halo", 65]
];

const STAGES = ["Placed", "Paid", "Confirmed", "Preparing", "Ready", "Completed"];
const API_URL = "/api/orders";

let orders = [];
let counter = 0;
let paid = false;

const $ = id => document.getElementById(id);

// Load orders directly from backend database
async function loadOrders() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch orders");
    orders = await res.json();
    
    // Set counter based on highest order number in database
    counter = orders.length ? Math.max(...orders.map(o => parseInt(o.no) || 0)) : 0;
    render();
  } catch (err) {
    console.error("Error connecting to backend:", err);
    $("list").innerHTML = `<div class="empty">Unable to connect to database. Make sure Node.js server (server.js)</div>`;
  }
}

// Populate menu items
$("food").innerHTML = MENU.map((m, i) => `<option value="${i}">${m[0]} - ₱${m[1]}</option>`).join("");

// Calculate total price based on selected item and quantity
function calc() {
  const q = parseInt($("qty").value) || 0;
  $("total").textContent = "₱" + (MENU[$("food").value][1] * Math.max(q, 0));
}

$("food").onchange = $("qty").oninput = calc;
calc();

function setPay(v) {
  paid = v;
  $("payYes").className = v ? "on" : "";
  $("payNo").className = v ? "" : "on";
}

$("payYes").onclick = () => setPay(true);
$("payNo").onclick = () => setPay(false);

// Place order handler (Sends POST request to server.js)
$("place").onclick = async () => {
  const name = $("cust").value.trim();
  const qty = parseInt($("qty").value);

  if (!name) {
    $("err").textContent = "Enter the customer's name.";
    $("cust").focus();
    return;
  }
  if (!qty || qty < 1) {
    $("err").textContent = "Quantity must be at least 1.";
    return;
  }

  $("err").textContent = "";
  const [food, price] = MENU[$("food").value];
  counter++;

  const newOrder = {
    no: String(counter).padStart(3, "0"),
    customer: name,
    food,
    qty,
    total: price * qty,
    payment: paid ? "PAID" : "UNPAID",
    stage: paid ? 2 : 0
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder)
    });

    if (!res.ok) throw new Error("Failed to save order");

    $("cust").value = "";
    $("qty").value = 1;
    setPay(false);
    calc();

    loadOrders(); // Refresh state from backend
  } catch (err) {
    $("err").textContent = "Failed to save order to database.";
    console.error(err);
  }
};

// Clear all orders handler (Sends DELETE request to server.js)
$("clear").onclick = async () => {
  if (orders.length && confirm("Remove all orders from database?")) {
    try {
      await fetch(API_URL, { method: "DELETE" });
      counter = 0;
      loadOrders();
    } catch (err) {
      alert("Failed to clear database.");
      console.error(err);
    }
  }
};

// Update order stage / payment (Sends PUT request to server.js)
async function act(no, type) {
  const o = orders.find(x => x.no === no);
  if (!o) return;

  let newPayment = o.payment;
  let newStage = o.stage;

  if (type === "pay") {
    newPayment = "PAID";
    newStage = 2;
  } else if (o.payment === "PAID" && o.stage < 5) {
    newStage++;
  }

  try {
    const res = await fetch(`${API_URL}/${no}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: newPayment, stage: newStage })
    });

    if (!res.ok) throw new Error("Failed to update order");
    loadOrders();
  } catch (err) {
    alert("Failed to update order in database.");
    console.error(err);
  }
}

// Export backup to TXT file
$("exportTxt").onclick = () => {
  if (!orders.length) {
    alert("No orders to export.");
    return;
  }
  const dataString = JSON.stringify({ orders, counter }, null, 2);
  const blob = new Blob([dataString], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-backup-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

// Import backup from TXT file
$("importTxt").onclick = () => $("fileInput").click();
$("fileInput").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data.orders) && typeof data.counter === "number") {
        // Upload imported orders to backend sequentially
        for (const order of data.orders) {
          await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order)
          });
        }
        loadOrders();
        alert("File orders imported to database!");
      } else {
        alert("Invalid file format. Please upload a valid backup .txt file.");
      }
    } catch (err) {
      alert("Contents of the file could not be read!");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
};

function status(o) {
  return o.payment === "UNPAID" ? "PENDING PAYMENT" : STAGES[o.stage].toUpperCase();
}

function render() {
  if (!orders.length) {
    $("list").innerHTML = '<div class="empty">No orders in database yet. Fill in the form to place one.</div>';
    return;
  }

  $("list").innerHTML = orders.map(o => {
    const pend = o.payment === "UNPAID";
    const done = o.stage === 5 && !pend;
    const st = status(o);

    const steps = STAGES.map((s, i) => {
      let c = "step";
      if (pend) {
        if (i === 0) c += " now";
      } else if (i < o.stage || done) {
        c += " did";
      } else if (i === o.stage) {
        c += " now";
      }

      if (!pend && i === o.stage && !done) c = "step now";
      return `<div class="${c}"><i></i>${s}</div>`;
    }).join("");

    const nextLabel = o.stage === 2 ? "Start preparing" : o.stage === 3 ? "Mark ready" : o.stage === 4 ? "Complete order" : "";

    let btns = "";
    if (pend) {
      btns = `<button class="on" data-a="pay" data-n="${o.no}">Record payment</button>`;
    } else if (!done) {
      btns = `<button class="on" data-a="next" data-n="${o.no}">${nextLabel}</button>`;
    }

    return `<article class="order ${pend ? "pending" : done ? "done" : "active"}">
      <div class="head">
        <span class="no">Order ${o.no}</span>
        <span class="badge ${pend ? "PENDING" : done ? "COMPLETED" : ""}">${st}</span>
      </div>
      <dl>
        <dt>Customer</dt><dd>${esc(o.customer)}</dd>
        <dt>Food</dt><dd>${esc(o.food)} × ${o.qty}</dd>
        <dt>Price</dt><dd>₱${o.total}</dd>
        <dt>Payment</dt><dd><span class="badge ${pend ? "unpaid" : "paid"}">${o.payment}</span></dd>
        <dt>Order status</dt><dd>${st}</dd>
      </dl>
      <div class="steps">${steps}</div>
      <div class="acts">${btns}</div>
    </article>`;
  }).join("");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

$("list").onclick = e => {
  const b = e.target.closest("button[data-a]");
  if (b) act(b.dataset.n, b.dataset.a);
};

// Initial load from MySQL backend
loadOrders();