(() => {
  const API = (window.APP_CONFIG.API_BASE_URL || "").replace(/\/$/, "") + "/api/students";
  const $ = (s) => document.querySelector(s);

  let toastTimer;
  function toast(msg, ok = true) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = ok ? "ok" : "err";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = ""), 4000);
  }

  async function api(path = "", options = {}) {
    let res;
    try {
      res = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...options });
    } catch (e) {
      throw new Error("Cannot reach the server. If the backend was idle, wait a minute and retry.");
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = body.errors ? ": " + body.errors.join(", ") : "";
      throw new Error((body.message || "Request failed") + detail);
    }
    return body;
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));

  // Basic client-side validation (backend validates again)
  function checkForm(data, requireId) {
    if (requireId && !data.studentId) return "Student ID is required";
    if (!data.name) return "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) return "Enter a valid email";
    if (!data.department) return "Department is required";
    const s = Number(data.semester);
    if (!Number.isInteger(s) || s < 1 || s > 12) return "Semester must be between 1 and 12";
    if (data.contact && !/^\d{10}$/.test(data.contact)) return "Contact must be 10 digits";
    return null;
  }

  function formData(form) {
    const d = Object.fromEntries(new FormData(form).entries());
    Object.keys(d).forEach((k) => (d[k] = String(d[k]).trim()));
    return d;
  }

  function rows(list) {
    if (!list.length) return "<tr><td colspan=\"7\" class=\"empty\">No students found</td></tr>";
    return list.map((s) => `
      <tr>
        <td>${esc(s.studentId)}</td><td>${esc(s.name)}</td><td>${esc(s.email)}</td>
        <td>${esc(s.department)}</td><td>${esc(s.semester)}</td><td>${esc(s.contact)}</td>
        <td class="actions">
          <button class="edit" data-edit="${esc(s.studentId)}">Edit</button>
          <button class="danger" data-del="${esc(s.studentId)}">Delete</button>
        </td>
      </tr>`).join("");
  }

  // ---------- navigation ----------
  function show(page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
    document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    if (page === "list") loadList();
    if (page === "home") loadStats();
  }
  $("#nav").addEventListener("click", (e) => e.target.dataset.page && show(e.target.dataset.page));

  // ---------- READ ----------
  async function loadStats() {
    try {
      const r = await api();
      $("#stat-total").textContent = r.count;
      $("#stat-api").textContent = "Online";
    } catch (e) {
      $("#stat-total").textContent = "-";
      $("#stat-api").textContent = "Offline";
    }
  }

  async function loadList() {
    $("#list-body").innerHTML = "<tr><td colspan=\"7\" class=\"empty\">Loading...</td></tr>";
    try {
      const r = await api();
      $("#list-body").innerHTML = rows(r.data);
    } catch (e) {
      $("#list-body").innerHTML = "<tr><td colspan=\"7\" class=\"empty\">Could not load students</td></tr>";
      toast(e.message, false);
    }
  }
  $("#refresh").addEventListener("click", loadList);

  // ---------- CREATE ----------
  $("#add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formData(e.target);
    const err = checkForm(data, true);
    if (err) return toast(err, false);
    try {
      const r = await api("", { method: "POST", body: JSON.stringify(data) });
      toast(r.message);
      e.target.reset();
    } catch (ex) { toast(ex.message, false); }
  });

  // ---------- SEARCH ----------
  $("#search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("#search-input").value.trim();
    if (!q) return;
    try {
      const r = await api("?search=" + encodeURIComponent(q));
      $("#search-body").innerHTML = rows(r.data);
      toast(`${r.count} result(s) found`);
    } catch (ex) { toast(ex.message, false); }
  });

  // ---------- UPDATE / DELETE ----------
  function refreshVisible() {
    if ($("#page-list").classList.contains("active")) return loadList();
    if ($("#page-search").classList.contains("active")) $("#search-form").requestSubmit();
  }

  document.addEventListener("click", async (e) => {
    const delId = e.target.dataset.del;
    const editId = e.target.dataset.edit;

    if (delId) {
      if (!confirm(`Delete student ${delId}?`)) return;
      try {
        const r = await api("/" + encodeURIComponent(delId), { method: "DELETE" });
        toast(r.message);
        refreshVisible();
      } catch (ex) { toast(ex.message, false); }
    }

    if (editId) {
      try {
        const r = await api("/" + encodeURIComponent(editId));
        const f = $("#edit-form");
        ["name", "email", "department", "semester", "contact"].forEach((k) => (f.elements[k].value = r.data[k] ?? ""));
        f.dataset.id = r.data.studentId;
        $("#edit-id").textContent = "(" + r.data.studentId + ")";
        $("#modal").classList.remove("hidden");
      } catch (ex) { toast(ex.message, false); }
    }
  });

  $("#edit-cancel").addEventListener("click", () => $("#modal").classList.add("hidden"));

  $("#edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formData(e.target);
    const err = checkForm(data, false);
    if (err) return toast(err, false);
    try {
      const r = await api("/" + encodeURIComponent(e.target.dataset.id), { method: "PUT", body: JSON.stringify(data) });
      toast(r.message);
      $("#modal").classList.add("hidden");
      refreshVisible();
    } catch (ex) { toast(ex.message, false); }
  });

  loadStats();
})();
