window.BUILTIN_TEMPLATES = window.BUILTIN_TEMPLATES || {};
window.BUILTIN_TEMPLATES["Beer Main"] = {
  sections:[ 
    { key:"html__intro__0", inner:`
<h2 class="intro__h1">Привет друг!</h2>
<p class="intro__p">Здесь культура крафта! Это приложение про игры, бонусы и знание пивных стилей.
Продолжая, подтверждаешь возраст 18+ и согласие с правилами.</p>
` },
    { key:"html__intro__1", inner:`
<h2 class="intro__h1">Как это работает?</h2>
<p class="intro__p">Играй в «Шмеля», проходи викторины, собирай Паспорт стилей.
За активность — монеты. Монеты — колесо бонусов, мерч, снеки, купоны.</p>
` },
    { key:"html__intro__2", inner:`
<h2 class="intro__h1">Про сообщество</h2>
<p class="intro__p">Мы локальная команда: свежесть, малые пивоварни, сезонные партии.
Есть безалкогольные позиции, дружим с локальными закусками и мерчем.</p>
` },
    { key:"html__intro__3", inner:`
<h2 class="intro__h1">Отлично! Погнали</h2>
<p class="intro__p">Первый спин — в подарок. В профиле видны баланс, призы и рефералы.
Играй честно, бонусы забирай в магазине.</p>
` },
    { key:"html__sheet__panel", inner:`
<div class="sheet__handle"></div>
<header class="sheet__header">
<!-- ===== <h3 class="sheet__title">Заголовок</h3> ===== -->
<button aria-label="Закрыть" class="sheet__close" data-close-sheet="">❌</button>
</header>
<div class="sheet__body" id="sheet-body"></div>
` },
    { key:"html__home", inner:`
<div class="hero">
<img alt="Beer Hero" class="hero__media" src="img/beer_hero.jpg"/>
</div>
<div class="promo">
<div class="promo__icon"><img alt="" src="img/beer_cup.png"/></div>
<div>
<div class="promo__title">Craft Beer</div>
<div class="promo__sub">Кто мы, где мы</div>
</div>
<button aria-controls="intro" aria-label="Открыть онбординг" class="promo__btn" data-open-intro="">О нас</button>
</div>
<div class="card list-card tight">
<div class="list-head">С чего начать</div>
<div class="list">
<div class="list__item">
<div class="list__icon"><img alt="" src="img/pasport.png"/></div>
<div class="list__text">
<div class="list__title">Паспорт стилей</div>
<div class="list__sub">Собери 6 штампов — подарок</div>
</div>
<button class="list__chev-btn" data-open-sheet="" data-title="Пивной Паспорт" data-tpl="#tpl-passport">›</button>
</div>
<div class="list__item">
<div class="list__icon"><img alt="" src="img/casino-chips.png"/></div>
<div class="list__text">
<div class="list__title">Викторина</div>
<div class="list__sub">Проверь свои пивные знания</div>
</div>
<button class="list__chev-btn" data-open-sheet="" data-title="Викторина" data-tpl="#tpl-trivia">›</button>
</div>
<div class="list__item">
<div class="list__icon"><img alt="" src="img/fren.png"/></div>
<div class="list__text">
<div class="list__title">Пригласи друзей</div>
<div class="list__sub">Дарим +100 монет за друга</div>
</div>
<button class="list__chev-btn" data-open-sheet="" data-title="Рефералы" data-tpl="#tpl-ref">›</button>
</div>
</div>
</div>
 Games карточки ИГРЫ 
<div class="card list-card games tight">
<div class="list-head">Игры</div>
<div class="list">
<!-- Шмель -->
<div class="list__item">
<div class="list__icon"><img alt="" src="img/bumblebee.png"/></div>
<div class="list__text">
<div class="list__title">Bumblebee</div>
<div class="list__sub">Долети до нас и получи приз</div>
</div>
<!-- Кнопка запуска на главной -->
<button class="list__btn list__btn--primary" data-open-flappy="">Играть</button>
</div>
<!-- Гонки -->
<div class="list__item">
<div class="list__icon"><img alt="" src="img/racing.png"/></div>
<div class="list__text">
<div class="list__title">Night Racing</div>
<div class="list__sub">Катайся и прокачивай тачку</div>
</div>
<!-- Кнопка запуска на главной -->
<button class="list__btn list__btn--primary" data-open-runner="">Cкоро</button>
</div>
<!-- Бонусы -->
<div class="list__item">
<div class="list__icon"><img alt="" src="img/beercard.png"/></div>
<div class="list__text">
<div class="list__title">Memory cards</div>
<div class="list__sub">Найди все спрятанные карточки быстрее</div>
</div>
<!-- Кнопка запуска на главной -->
<button class="list__btn list__btn--primary" data-open-runner="">Скоро</button>
</div>
</div>
</div>` },
    { key:"html__leaderboard", inner:`
 Leaderboard 
<div class="card lb-card inner" id="leaderboard">
<div class="lb-head">
<div>
<div class="lb-title">Bumblebee</div>
<div class="lb-sub">Турнирная таблица</div>
</div>
<div aria-label="Leaderboard period" class="lb-seg" role="tablist">
<button aria-pressed="true" data-lb-tab="today" type="button">День</button>
<button data-lb-tab="all" type="button">Все</button>
</div>
</div>
<!-- Ты -->
<div class="lb-you" id="lb-you">
<div class="lb-you__avatar" data-role="lb-you-avatar" id="lb-you-ava">YOU</div>
<div class="lb-you__meta">
<div class="lb-you__name" data-role="lb-you-name" id="lb-you-name">You</div>
<div class="lb-sub" data-role="lb-you-label" id="lb-you-note">best score</div>
</div>
<div class="lb-you__score" data-role="lb-you-score" id="lb-you-score">0</div>
</div>
<!-- Топ -->
<div class="lb-list" id="lb-list">
<!-- сюда JS рендерит строки -->
</div>
<div class="lb-actions">
<button class="lb-btn" data-lb-refresh="" id="lb-refresh" type="button">
<span data-role="lb-refresh-label">Обновить</span>
</button>
<button class="lb-btn lb-btn--primary" data-open-flappy="" type="button">
    Играть
  </button>
</div>
</div>` },
    { key:"html__bonuses", inner:`
<div class="card page-title">
<h2 class="h1">Бонусы</h2>
<p class="muted-sm">Крути колесо и забирай выпавший подарок. Вращение 100 монет</p>
</div>
<div class="card bonus-card">
<div class="h2"></div>
<!-- ВЕРХ: только плашка-подсказка -->
<div class="bonus-head">
<div class="picked-pill muted" id="pickedPill">Нажми «Крутануть»</div>
</div>
<!-- КОЛЕСО -->
<div aria-live="polite" class="bonus-wheel" id="bonusWheel">
<div class="wheel-track" id="wheelTrack">
<button class="bonus" data-code="mug" data-name="Кружка">
<img alt="Кружка" src="img/beer_cup.png"/><span>Кружка</span>
</button>
<button class="bonus" data-code="tshirt" data-name="Футболка">
<img alt="Футболка" src="img/tshirt.png"/><span>Футболка</span>
</button>
<button class="bonus" data-code="nuts" data-name="Фисташки">
<img alt="Фисташки" src="img/pistachio.png"/><span>Фисташки</span>
</button>
<button class="bonus" data-code="discount" data-name="Скидка -10%">
<img alt="Скидка -10%" src="img/bonus4.png"/><span>Скидка</span>
</button>
<button class="bonus" data-code="tasting" data-name="Дегустация">
<img alt="Дегустация" src="img/tongue-out.png"/><span>Дегустация</span>
</button>
<button class="bonus" data-code="coins_20" data-name="20 монет">
<img alt="20 монет" src="img/coin.png"/><span>20 монет</span>
</button>
<button class="bonus" data-code="coins_5" data-name="5 монет">
<img alt="5 монет" src="img/coin.png"/><span>5 монет</span>
</button>
</div>
<div class="wheel-center"></div>
</div>
<!-- НИЗ: две кнопки в ряд -->
<div class="actions">
<button class="btn btn-primary" id="spinBtn">Крутануть</button>
<button class="btn btn-primary" disabled="" id="claimBtn">Забрать</button>
</div>
</div>
` },
    { key:"html__profile", inner:`
 ===== PROFILE · HERO ===== 
 ===== PROFILE · HERO ===== 
<section class="card profile-hero">
<div class="pf-hero">
<div class="pf-about">
<div class="pf-title" id="pf-title">Гость</div>
<div class="pf-hint" id="pf-username"></div>
</div>
<div class="metric metric--balance">
<div class="metric__val">
<span id="pf-coins">0</span>
<i aria-hidden="true" class="coin-ico"></i>
</div>
<div class="metric__lbl"></div>
</div>
<!-- аватар справа -->
<img alt="" class="pf-ava" id="pf-ava"/>
</div>
</section>
<div aria-hidden="true" style="height:30px;"></div>
 ===== BLOCK 2: Призы · Игры ===== 
<section class="card profile-block">
<div class="section-title">🎯 Мои достижения</div>
<div class="metrics">
<div class="metric">
<div class="metric__val" id="pf-flappy-best">0</div>
<div class="metric__lbl">Шмель — лучший счёт</div>
</div>
<div class="metric">
<div class="metric__val" id="pf-pass-count">0/6</div>
<div class="metric__lbl">Паспорт — штампы</div>
</div>
<div class="metric">
<div class="metric__val" id="pf-pass-list">—</div>
<div class="metric__lbl">Получены</div>
</div>
<div class="metric">
<div class="metric__val" id="pf-refs-count">0</div>
<div class="metric__lbl">Мои рефералы</div>
</div>
</div>
</section>
<div aria-hidden="true" style="height:25px;"></div>
 ===== BLOCK 3: Турнир · Рефералы ===== 
<section class="card profile-block">
<div class="section-title">🏆 Турнир</div>
<div class="metrics">
<div class="metric">
<div class="metric__val" id="pf-today-rank">—</div>
<div class="metric__lbl">Место сегодня</div>
</div>
<div class="metric">
<div class="metric__val" id="pf-all-rank">—</div>
<div class="metric__lbl">All-time</div>
</div>
</div>
<!-- =====<div class="actions">
    <button class="btn btn-white" id="pf-join">Участвовать</button>
    <button class="btn btn-white" id="pf-invite">Пригласить</button>
  </div>===== -->
<div aria-hidden="true" style="height:19px;"></div>
<div class="panel panel--prizes">
<div class="panel__head">
<div class="panel__title">Последние призы</div>
</div>
<div class="ticker js-ticker">
<div class="chips ticker__track" id="pf-prizes">
<span class="chip chip--muted">Пока пусто</span>
</div>
<div aria-hidden="true" class="chips ticker__track ticker__clone"></div>
</div>
</div>
</section>
` },
    { key:"html__profile_hero", inner:`
<div class="pf-hero">
<div class="pf-about">
<div class="pf-title" id="pf-title">Гость</div>
<div class="pf-hint" id="pf-username"></div>
</div>
<div class="metric metric--balance">
<div class="metric__val">
<span id="pf-coins">0</span>
<i aria-hidden="true" class="coin-ico"></i>
</div>
<div class="metric__lbl"></div>
</div>
<!-- аватар справа -->
<img alt="" class="pf-ava" id="pf-ava"/>
</div>
` },
  ]
};
