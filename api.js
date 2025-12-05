// js/api.js

const API_BASE = "https://YOUR_BACKEND_URL_HERE"; // заменишь на свой воркер/GAS
const TOKEN_KEY = "cabinet_token";

// DEMO_MODE: пока нет бэка, всё будет работать на заглушках
const DEMO_MODE = true;

const API = {
  DEMO_MODE,

  // --- AUTH ---

  isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  logout() {
    this.clearToken();
  },

  async login(email, password) {
    if (DEMO_MODE) {
      // Любой логин / пароль — успешный вход в демо
      this.setToken("demo-token");
      return true;
    }

    const res = await fetch(API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (data.ok && data.token) {
      this.setToken(data.token);
      return true;
    }
    return false;
  },

  async getMe() {
    if (DEMO_MODE) {
      return {
        owner_name: "Иван Петров",
        owner_role: "Владелец магазина",
        shop: {
          id: "shop_00127",
          name: "Магазин «Шмель на Тверской»",
          started_at: "Старт мини-аппа: 05.11.2025",
          plan_label: "Pro · ежемесячно",
          update_label: "Данные обновляются каждые 5 минут",
        },
      };
    }

    const res = await this._authedGet("/auth/me");
    if (!res.ok) return null;
    return res.json();
  },

  // --- DASHBOARD ---

  async getDashboard(period) {
    if (DEMO_MODE) {
      return this._demoDashboard();
    }

    const url =
      "/cabinet/dashboard" +
      (period ? "?period=" + encodeURIComponent(period) : "");
    const res = await this._authedGet(url);
    if (!res.ok) throw new Error("Dashboard error");
    return res.json();
  },

  // --- CLIENTS ---

  async getClientByQuery(query) {
    if (DEMO_MODE) {
      return {
        id: 123456789,
        username: query.replace(/^@/, ""),
        name: "Клиент " + query,
        status_label: "активен",
        checks_total: 5,
        revenue_total: 4250,
        last_visit: "02.12.2025",
        games_spins: 12,
        stamps_collected: 4,
        stamps_total: 6,
        coins_balance: 320,
      };
    }

    const res = await this._authedGet(
      "/cabinet/client?query=" + encodeURIComponent(query)
    );
    if (!res.ok) throw new Error("Client error");
    return res.json();
  },

  // --- SETTINGS ---

  async getSettings() {
    if (DEMO_MODE) {
      return {
        shop_name: "Магазин «Шмель на Тверской»",
        shop_id: "shop_00127",
        update_period: "5m",
        max_spins_per_day: 3,
        max_prizes_per_day: 50,
        min_check_enabled: true,
        pin_mask: "••••",
        staff_list: "@barmen1 · бар, @barmen2 · бар",
        limit_per_shift: false,
        prizes: [
          { code: "mug", name: "Кружка", enabled: true },
          { code: "tee", name: "Футболка", enabled: true },
          { code: "nuts", name: "Фисташки", enabled: true },
          { code: "discount10", name: "Скидка 10%", enabled: false },
        ],
      };
    }

    const res = await this._authedGet("/cabinet/settings");
    if (!res.ok) throw new Error("Settings error");
    return res.json();
  },

  async updateSettings(payload) {
    if (DEMO_MODE) {
      console.log("DEMO updateSettings", payload);
      return { ok: true };
    }

    const res = await this._authedPost("/cabinet/settings/update", payload);
    if (!res.ok) throw new Error("Settings update error");
    return res.json();
  },

  // --- INTERNAL HELPERS ---

  async _authedGet(path) {
    return fetch(API_BASE + path, {
      headers: {
        Authorization: "Bearer " + this.getToken(),
      },
    });
  },

  async _authedPost(path, body) {
    return fetch(API_BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + this.getToken(),
      },
      body: JSON.stringify(body),
    });
  },

  formatMoney(amount) {
    const n = Number(amount || 0);
    const parts = n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, "&nbsp;");
    return parts + "&nbsp;₽";
  },

  _demoDashboard() {
    return {
      period: "30d",
      revenue_mini: 412300,
      revenue_all: 1080000,
      revenue_share: 38,
      revenue_delta: 27,

      checks_mini: 1238,
      checks_share: 38,
      checks_delta_count: 184,

      avg_check_mini: 850,
      avg_check_all: 640,
      avg_check_delta: 32,

      repeat_share: 42,
      repeat_others: 19,

      clients_new: 352,
      clients_active: 714,
      clients_total: 2184,

      retention_2plus: 42,
      retention_2plus_comment: "в 2,2 раза выше остальных",
      retention_3plus: 21,
      retention_avg_days: 5.3,

      games_spins: 527,
      games_players: 183,
      games_avg_check_players: 920,
      games_avg_check_others: 610,
      games_extra_revenue_per_client: 310,

      promos: [
        {
          name: "«-10% на 4 бутылки IPA»",
          period: "01–15.11",
          checks: 63,
          revenue: 54800,
          avg_check: 870,
          status: "finished",
        },
        {
          name: "«5-й бокал в подарок»",
          period: "10–30.11",
          checks: 41,
          revenue: 39200,
          avg_check: 956,
          status: "active",
        },
        {
          name: "«Монеты за друга»",
          period: "01–30.11",
          checks: 28,
          revenue: 18600,
          avg_check: 664,
          status: "active",
        },
      ],
    };
  },
};

// Делаем API глобальным
window.API = API;
