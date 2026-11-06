import { clearHistory, getHistory, getPreference, setPreference } from './js/storage.js';
import { PeerConnection } from './js/webrtc.js';
import { TransferManager } from './js/transfers.js';

const translations = {
	en: {
		navHome: 'Home', navConnect: 'Connect devices', navFiles: 'File explorer',
		navTransfers: 'Transfers', navHistory: 'History', navSettings: 'Settings',
		privacy: 'Private by design', online: 'Ready to connect', titleHome: 'Your files, your devices.',
		subtitleHome: 'Move files directly between your devices. Nothing is uploaded or stored in the cloud.',
		createConnection: 'Create connection', joinConnection: 'Join a connection',
		sendFiles: 'Send files', receiveFiles: 'Receive files', recentTransfers: 'Recent transfers',
		noRecent: 'Your recent transfers will appear here.', howItWorks: 'Simple. Direct. Private.',
		stepOne: 'Connect devices', stepOneText: 'Exchange connection details directly between your screens.',
		stepTwo: 'Choose your files', stepTwoText: 'Pick files or drop them here. You stay in control.',
		stepThree: 'Transfer directly', stepThreeText: 'Files travel peer to peer, never through a file server.',
		connectionTitle: 'Connect your devices', connectionSubtitle: 'Exchange a one-time connection code between both devices.',
		connectionNotice: 'Both devices need to be open at the same time. LocalDrop does not use a signaling server, STUN, or TURN. Direct connections depend on your network.',
		stepCreate: '1. Create an offer', stepJoin: '2. Join with an offer', stepFinish: '3. Finish the connection',
		createOffer: 'Create offer', offerLabel: 'Your connection offer', offerPlaceholder: 'Your offer appears here…',
		copy: 'Copy', joinOfferLabel: 'Paste the other device’s offer', joinOfferPlaceholder: 'Paste the complete offer JSON…',
		createAnswer: 'Create answer', answerLabel: 'Your connection answer', answerPlaceholder: 'Your answer appears here…',
		answerLabelInput: 'Paste the answer on the device that created the offer',
		answerPlaceholderInput: 'Paste the complete answer JSON…', finishConnection: 'Finish connection',
		manualOnly: 'Manual exchange', manualOnlyText: 'QR generation and scanning are not available in this build. Copy the full connection code and send it directly to the other device (for example, with a local text message). Do not use a public sharing service.',
		cancelConnection: 'Cancel connection', connected: 'Connected', notConnected: 'Not connected',
		device: 'Peer device', noPeer: 'Waiting for the other device to connect',
		explorerTitle: 'File explorer', explorerSubtitle: 'Choose files to send or browse the files you’ve selected.',
		addFiles: 'Choose files', addFolder: 'Choose folder', dropTitle: 'Drop files here',
		dropText: 'or choose files from this device', searchFiles: 'Search files…', sortName: 'Name',
		sortSize: 'Size', sortDate: 'Date modified', file: 'File', size: 'Size', modified: 'Modified',
		preview: 'Preview', remove: 'Remove', selectedFiles: 'Selected files', clear: 'Clear all',
		transfersTitle: 'Transfers', transfersSubtitle: 'Live status for files sent and received in this session.',
		noTransfers: 'No transfers yet. Connect a device and choose files to get started.',
		historyTitle: 'Transfer history', historySubtitle: 'This history is stored on this device only.',
		noHistory: 'Completed transfers will appear here.', settingsTitle: 'Settings',
		settingsSubtitle: 'Make LocalDrop feel right for you.', appearance: 'Appearance',
		language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark',
		english: 'English', arabic: 'العربية', offline: 'App shell available offline',
		offlineText: 'The interface can start offline after it has been loaded once. Peer-to-peer connections are separate and may not work on every network.',
		limitations: 'Browser limitations', limitationText: 'LocalDrop cannot access all of your device storage, run an HTTP server on Android, or guarantee a direct connection. Camera, background activity, and file access depend on your browser. Transfers do not resume after a connection is interrupted.',
		accept: 'Accept', reject: 'Decline', cancel: 'Cancel transfer', download: 'Download',
		waiting: 'Waiting for approval', pending: 'Incoming request', sending: 'Sending',
		receiving: 'Receiving', complete: 'Complete', cancelled: 'Cancelled', rejected: 'Declined',
		failed: 'Failed', queued: 'Queued', speed: 'Speed', remaining: 'remaining',
		errorTitle: 'Something went wrong', close: 'Close', copied: 'Copied to clipboard',
		offerCreated: 'Offer created. Share it directly with the other device.',
		answerCreated: 'Answer created. Paste it back on the device that made the offer.',
		connectionMade: 'Peer connection established.', connectionFailed: 'Connection failed. This network may not permit a direct peer connection.',
		notSupported: 'This browser does not support WebRTC.',
		notificationTitle: 'Transfer complete', notificationText: 'Your file is ready to download.',
		previewUnsupported: 'Preview is not available for this file type.',
		install: 'Install app', clearHistory: 'Clear history',
	},
	ar: {
		navHome: 'الرئيسية', navConnect: 'اتصال الأجهزة', navFiles: 'مستكشف الملفات',
		navTransfers: 'النقل', navHistory: 'السجل', navSettings: 'الإعدادات',
		privacy: 'خصوصية من التصميم', online: 'جاهز للاتصال', titleHome: 'ملفاتك، أجهزتك.',
		subtitleHome: 'انقل الملفات مباشرة بين أجهزتك. لا يتم رفع أي شيء إلى السحابة أو تخزينه فيها.',
		createConnection: 'إنشاء اتصال', joinConnection: 'الانضمام إلى اتصال',
		sendFiles: 'إرسال ملفات', receiveFiles: 'استقبال ملفات', recentTransfers: 'عمليات النقل الأخيرة',
		noRecent: 'ستظهر عمليات النقل الأخيرة هنا.', howItWorks: 'بسيط. مباشر. خاص.',
		stepOne: 'اتصل بالأجهزة', stepOneText: 'تبادل تفاصيل الاتصال مباشرة بين الشاشتين.',
		stepTwo: 'اختر ملفاتك', stepTwoText: 'اختر الملفات أو اسحبها إلى هنا. أنت المتحكم.',
		stepThree: 'نقل مباشر', stepThreeText: 'تنتقل الملفات مباشرة بين الجهازين دون خادم ملفات.',
		connectionTitle: 'اتصل بأجهزتك', connectionSubtitle: 'تبادل رمز اتصال لمرة واحدة بين الجهازين.',
		connectionNotice: 'يجب فتح التطبيق على الجهازين في الوقت نفسه. لا يستخدم LocalDrop خادم إشارات أو STUN أو TURN. يعتمد الاتصال المباشر على شبكتك.',
		stepCreate: '١. إنشاء عرض', stepJoin: '٢. الانضمام بعرض', stepFinish: '٣. إكمال الاتصال',
		createOffer: 'إنشاء عرض', offerLabel: 'عرض الاتصال الخاص بك', offerPlaceholder: 'سيظهر العرض هنا…',
		copy: 'نسخ', joinOfferLabel: 'الصق عرض الجهاز الآخر', joinOfferPlaceholder: 'الصق بيانات العرض JSON كاملة…',
		createAnswer: 'إنشاء إجابة', answerLabel: 'إجابة الاتصال الخاصة بك', answerPlaceholder: 'ستظهر الإجابة هنا…',
		answerLabelInput: 'الصق الإجابة في الجهاز الذي أنشأ العرض',
		answerPlaceholderInput: 'الصق بيانات الإجابة JSON كاملة…', finishConnection: 'إكمال الاتصال',
		manualOnly: 'تبادل يدوي', manualOnlyText: 'إنشاء رموز QR ومسحها غير متاح في هذا الإصدار. انسخ رمز الاتصال بالكامل وأرسله مباشرة إلى الجهاز الآخر. لا تستخدم خدمة مشاركة عامة.',
		cancelConnection: 'إلغاء الاتصال', connected: 'متصل', notConnected: 'غير متصل',
		device: 'الجهاز الآخر', noPeer: 'بانتظار اتصال الجهاز الآخر',
		explorerTitle: 'مستكشف الملفات', explorerSubtitle: 'اختر ملفات لإرسالها أو تصفح الملفات التي اخترتها.',
		addFiles: 'اختيار ملفات', addFolder: 'اختيار مجلد', dropTitle: 'أفلت الملفات هنا',
		dropText: 'أو اختر ملفات من هذا الجهاز', searchFiles: 'ابحث عن الملفات…', sortName: 'الاسم',
		sortSize: 'الحجم', sortDate: 'تاريخ التعديل', file: 'ملف', size: 'الحجم', modified: 'تاريخ التعديل',
		preview: 'معاينة', remove: 'إزالة', selectedFiles: 'الملفات المحددة', clear: 'مسح الكل',
		transfersTitle: 'عمليات النقل', transfersSubtitle: 'حالة مباشرة للملفات المرسلة والمستلمة في هذه الجلسة.',
		noTransfers: 'لا توجد عمليات نقل بعد. اتصل بجهاز واختر ملفات للبدء.',
		historyTitle: 'سجل النقل', historySubtitle: 'يُحفظ هذا السجل على هذا الجهاز فقط.',
		noHistory: 'ستظهر عمليات النقل المكتملة هنا.', settingsTitle: 'الإعدادات',
		settingsSubtitle: 'خصص LocalDrop بالطريقة التي تناسبك.', appearance: 'المظهر',
		language: 'اللغة', theme: 'السمة', light: 'فاتح', dark: 'داكن',
		english: 'English', arabic: 'العربية', offline: 'واجهة التطبيق متاحة دون اتصال',
		offlineText: 'يمكن فتح الواجهة دون اتصال بعد تحميلها مرة واحدة. اتصال الأجهزة المباشر ميزة منفصلة وقد لا يعمل على كل الشبكات.',
		limitations: 'قيود المتصفح', limitationText: 'لا يستطيع LocalDrop الوصول إلى كامل مساحة تخزين الجهاز أو تشغيل خادم HTTP على Android أو ضمان الاتصال المباشر. تعتمد الكاميرا والعمل بالخلفية والوصول إلى الملفات على المتصفح. لا يمكن استئناف النقل بعد انقطاع الاتصال.',
		accept: 'قبول', reject: 'رفض', cancel: 'إلغاء النقل', download: 'تنزيل',
		waiting: 'بانتظار الموافقة', pending: 'طلب وارد', sending: 'جارٍ الإرسال',
		receiving: 'جارٍ الاستقبال', complete: 'مكتمل', cancelled: 'ملغى', rejected: 'مرفوض',
		failed: 'فشل', queued: 'في قائمة الانتظار', speed: 'السرعة', remaining: 'متبقية',
		errorTitle: 'حدث خطأ', close: 'إغلاق', copied: 'تم النسخ إلى الحافظة',
		offerCreated: 'تم إنشاء العرض. أرسله مباشرة إلى الجهاز الآخر.',
		answerCreated: 'تم إنشاء الإجابة. أعد لصقها على الجهاز الذي أنشأ العرض.',
		connectionMade: 'تم إنشاء اتصال مباشر.', connectionFailed: 'فشل الاتصال. قد لا تسمح هذه الشبكة باتصال مباشر.',
		notSupported: 'هذا المتصفح لا يدعم WebRTC.',
		notificationTitle: 'اكتمل النقل', notificationText: 'ملفك جاهز للتنزيل.',
		previewUnsupported: 'المعاينة غير متاحة لهذا النوع من الملفات.',
		install: 'تثبيت التطبيق', clearHistory: 'مسح السجل',
	}
};

const icons = {
	home: '<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
	link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71"/></svg>',
	folder: '<svg viewBox="0 0 24 24"><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
	transfer: '<svg viewBox="0 0 24 24"><path d="M7 7h14m0 0-4-4m4 4-4 4M17 17H3m0 0 4 4m-4-4 4-4"/></svg>',
	history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/></svg>',
	settings: '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.4-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.4-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.9Z"/></svg>',
	arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>',
};

const state = {
	language: 'en', theme: 'light', page: 'home', peer: null, transfers: null,
	files: [], history: [], connectionState: 'idle', installPrompt: null,
	search: '', sort: 'name', previewUrl: null,
};

function t(key) {
	return translations[state.language][key] || translations.en[key] || key;
}

function escapeHtml(value = '') {
	return String(value).replace(/[&<>"']/g, (char) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[char]);
}

function formatBytes(bytes) {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDate(timestamp) {
	return new Intl.DateTimeFormat(state.language === 'ar' ? 'ar' : 'en', {
		year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
	}).format(new Date(timestamp));
}

function render() {
	document.documentElement.lang = state.language;
	document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
	document.documentElement.dataset.theme = state.theme;
	const app = document.querySelector('#app');
	app.innerHTML = `
		<aside class="sidebar">
			<a class="brand" href="#" data-page="home"><span class="brand-mark">${icons.transfer}</span><span>LocalDrop<small>${t('privacy')}</small></span></a>
			<div class="side-label">${state.language === 'ar' ? 'القائمة' : 'MENU'}</div>
			<nav class="main-nav">
				${navLink('home', 'navHome', 'home')}
				${navLink('connect', 'navConnect', 'link')}
				${navLink('files', 'navFiles', 'folder')}
				${navLink('transfers', 'navTransfers', 'transfer')}
				${navLink('history', 'navHistory', 'history')}
			</nav>
			<div class="sidebar-bottom">
				<div class="privacy-card"><span class="privacy-dot"></span><span>${t('privacy')}<small>${t('online')}</small></span></div>
				${navLink('settings', 'navSettings', 'settings')}
			</div>
		</aside>
		<div class="main-area">
			<header class="topbar">
				<div class="mobile-brand"><span class="brand-mark">${icons.transfer}</span>LocalDrop</div>
				<div class="topbar-status"><span class="status-indicator ${state.connectionState === 'connected' ? 'is-connected' : ''}"></span>${state.connectionState === 'connected' ? t('connected') : t('notConnected')}</div>
				<div class="topbar-actions">
					${state.installPrompt ? `<button class="button button-quiet install-button" data-action="install">${t('install')}</button>` : ''}
					<button class="avatar-button" data-page="settings" aria-label="${t('navSettings')}">A</button>
				</div>
			</header>
			<main class="content">${renderPage()}</main>
			<nav class="mobile-nav">
				${['home', 'connect', 'files', 'transfers', 'settings'].map((id) =>
					`<button class="mobile-nav-item ${state.page === id ? 'active' : ''}" data-page="${id}">${icons[id === 'connect' ? 'link' : id === 'files' ? 'folder' : id === 'transfers' ? 'transfer' : id]}<span>${t(id === 'home' ? 'navHome' : id === 'connect' ? 'navConnect' : id === 'files' ? 'navFiles' : id === 'transfers' ? 'navTransfers' : 'navSettings')}</span></button>`
				).join('')}
			</nav>
		</div>
		<div id="toast-root" class="toast-root" aria-live="polite"></div>
		<div id="modal-root"></div>
	`;
	bindEvents();
}

function navLink(id, label, icon) {
	return `<button class="nav-link ${state.page === id ? 'active' : ''}" data-page="${id}">${icons[icon]}<span>${t(label)}</span>${id === 'transfers' && activeCount() ? `<span class="nav-count">${activeCount()}</span>` : ''}</button>`;
}

function renderPage() {
	if (state.page === 'connect') return renderConnect();
	if (state.page === 'files') return renderFiles();
	if (state.page === 'transfers') return renderTransfers();
	if (state.page === 'history') return renderHistory();
	if (state.page === 'settings') return renderSettings();
	return renderHome();
}

function renderHome() {
	const recent = [...state.transfers?.transfers.values() || []].filter((item) => item.status === 'complete').slice(-3).reverse();
	return `<section class="welcome-row">
		<div><div class="eyebrow">${t('privacy')}</div><h1>${t('titleHome')}</h1><p class="page-description">${t('subtitleHome')}</p></div>
		<div class="hero-mark">${icons.transfer}<span></span></div>
	</section>
	<section class="connection-banner ${state.connectionState === 'connected' ? 'connected-banner' : ''}">
		<div class="banner-icon">${icons.link}</div>
		<div class="banner-copy"><strong>${state.connectionState === 'connected' ? t('connected') : t('noPeer')}</strong><span>${state.connectionState === 'connected' ? t('device') : t('connectionNotice')}</span></div>
		<button class="button button-light" data-page="connect">${state.connectionState === 'connected' ? t('navConnect') : t('createConnection')} ${icons.arrow}</button>
	</section>
	<section class="quick-actions">
		<button class="action-card primary-action" data-action="go-files"><span class="action-icon">${icons.folder}</span><span class="action-text"><strong>${t('sendFiles')}</strong><small>${t('explorerSubtitle')}</small></span><span class="action-arrow">${icons.arrow}</span></button>
		<button class="action-card secondary-action" data-page="connect"><span class="action-icon">${icons.link}</span><span class="action-text"><strong>${t('receiveFiles')}</strong><small>${t('joinConnection')}</small></span><span class="action-arrow">${icons.arrow}</span></button>
	</section>
	<section class="steps-section"><div class="section-heading"><h2>${t('howItWorks')}</h2></div><div class="steps-grid">
		${[['01', 'stepOne', 'stepOneText'], ['02', 'stepTwo', 'stepTwoText'], ['03', 'stepThree', 'stepThreeText']].map(([number, title, text]) => `<article class="step-card"><span class="step-number">${number}</span><h3>${t(title)}</h3><p>${t(text)}</p></article>`).join('')}
	</div></section>
	<section class="recent-section"><div class="section-heading"><h2>${t('recentTransfers')}</h2><button class="text-button" data-page="history">${t('navHistory')} ${icons.arrow}</button></div>
		${recent.length ? `<div class="recent-list">${recent.map((item) => recentItem(item)).join('')}</div>` : `<div class="empty-inline">${t('noRecent')}</div>`}
	</section>`;
}

function renderConnect() {
	return `<section class="page-heading"><div><div class="eyebrow">${t('navConnect')}</div><h1>${t('connectionTitle')}</h1><p class="page-description">${t('connectionSubtitle')}</p></div></section>
	<div class="notice notice-info"><span class="notice-symbol">i</span><p>${t('connectionNotice')}</p></div>
	<div class="connection-grid">
		<section class="panel connection-panel"><div class="panel-step">${t('stepCreate')}</div><h2>${t('createOffer')}</h2><p class="muted">${state.connectionState === 'connected' ? t('connected') : t('manualOnly')}</p>
			<button class="button button-primary full-button" data-action="create-offer" ${state.connectionState === 'connected' ? 'disabled' : ''}>${t('createOffer')} ${icons.arrow}</button>
			<label class="field-label" for="offer-output">${t('offerLabel')}</label>
			<textarea id="offer-output" class="signal-area" rows="5" readonly placeholder="${t('offerPlaceholder')}">${escapeHtml(state.offer || '')}</textarea>
			${state.offer ? `<button class="button button-quiet copy-button" data-action="copy" data-target="offer-output">${t('copy')}</button>` : ''}
			${state.offer ? `<label class="field-label" for="answer-input">${t('answerLabelInput')}</label><textarea id="answer-input" class="signal-area" rows="4" placeholder="${t('answerPlaceholderInput')}"></textarea><button class="button button-secondary full-button" data-action="apply-answer">${t('finishConnection')}</button>` : ''}
		</section>
		<section class="panel connection-panel"><div class="panel-step">${t('stepJoin')}</div><h2>${t('joinConnection')}</h2><p class="muted">${t('manualOnlyText')}</p>
			<label class="field-label" for="offer-input">${t('joinOfferLabel')}</label><textarea id="offer-input" class="signal-area" rows="7" placeholder="${t('joinOfferPlaceholder')}"></textarea>
			<button class="button button-secondary full-button" data-action="create-answer">${t('createAnswer')} ${icons.arrow}</button>
			${state.answer ? `<label class="field-label" for="answer-output">${t('answerLabel')}</label><textarea id="answer-output" class="signal-area" rows="5" readonly>${escapeHtml(state.answer)}</textarea><button class="button button-quiet copy-button" data-action="copy" data-target="answer-output">${t('copy')}</button>` : ''}
		</section>
	</div>
	${state.connectionState === 'connected' ? `<div class="connection-success"><span class="success-check">✓</span><div><strong>${t('connectionMade')}</strong><p>${t('device')}: Local peer</p></div><button class="button button-quiet" data-action="close-peer">${t('cancelConnection')}</button></div>` : ''}
	<div class="notice notice-warning"><span class="notice-symbol">!</span><p><strong>${t('manualOnly')}</strong><br>${t('manualOnlyText')}</p></div>`;
}

function renderFiles() {
	const filtered = state.files.filter((file) => file.name.toLowerCase().includes(state.search.toLowerCase()));
	filtered.sort((a, b) => {
		if (state.sort === 'size') return b.size - a.size;
		if (state.sort === 'date') return b.lastModified - a.lastModified;
		return a.name.localeCompare(b.name);
	});
	return `<section class="page-heading"><div><div class="eyebrow">${t('navFiles')}</div><h1>${t('explorerTitle')}</h1><p class="page-description">${t('explorerSubtitle')}</p></div><div class="heading-actions"><label class="button button-secondary file-picker-button">${t('addFiles')}<input id="file-input" type="file" multiple hidden></label><label class="button button-quiet file-picker-button">${t('addFolder')}<input id="folder-input" type="file" webkitdirectory multiple hidden></label></div></section>
	<div class="drop-zone" id="drop-zone"><div class="drop-icon">${icons.folder}</div><h3>${t('dropTitle')}</h3><p>${t('dropText')}</p><button class="button button-primary" data-action="open-files">${t('addFiles')}</button></div>
	<section class="file-section"><div class="file-toolbar"><h2>${t('selectedFiles')} <span class="count-pill">${state.files.length}</span></h2><div class="toolbar-controls"><label class="search-box">${icons.history}<input id="file-search" value="${escapeHtml(state.search)}" placeholder="${t('searchFiles')}"></label><select id="sort-select" aria-label="${t('sortName')}"><option value="name" ${state.sort === 'name' ? 'selected' : ''}>${t('sortName')}</option><option value="size" ${state.sort === 'size' ? 'selected' : ''}>${t('sortSize')}</option><option value="date" ${state.sort === 'date' ? 'selected' : ''}>${t('sortDate')}</option></select>${state.files.length ? `<button class="text-button" data-action="clear-files">${t('clear')}</button>` : ''}</div></div>
		${filtered.length ? `<div class="file-list">${filtered.map((file) => fileRow(file)).join('')}</div>${state.connectionState === 'connected' ? `<button class="button button-primary send-selected" data-action="send-files">${t('sendFiles')} (${state.files.length}) ${icons.arrow}</button>` : `<p class="muted small-note">${t('notConnected')} — <button class="inline-link" data-page="connect">${t('createConnection')}</button></p>`}` : `<div class="empty-files"><span>${icons.folder}</span><strong>${t('noRecent')}</strong></div>`}
	</section>`;
}

function fileRow(file) {
	const key = state.files.indexOf(file);
	const extension = file.name.includes('.') ? file.name.split('.').pop().slice(0, 4).toUpperCase() : 'FILE';
	return `<article class="file-row"><div class="file-type-icon">${escapeHtml(extension)}</div><div class="file-meta"><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><small>${escapeHtml(file.type || t('file'))} · ${formatDate(file.lastModified)}</small></div><span class="file-size">${formatBytes(file.size)}</span><div class="file-actions">${file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf' ? `<button class="icon-button" title="${t('preview')}" data-action="preview" data-index="${key}">◉</button>` : ''}<button class="icon-button danger-icon" title="${t('remove')}" data-action="remove-file" data-index="${key}">×</button></div></article>`;
}

function renderTransfers() {
	const list = [...(state.transfers?.transfers.values() || [])].reverse();
	return `<section class="page-heading"><div><div class="eyebrow">${t('navTransfers')}</div><h1>${t('transfersTitle')}</h1><p class="page-description">${t('transfersSubtitle')}</p></div><div class="connection-pill ${state.connectionState === 'connected' ? 'positive' : ''}"><span></span>${state.connectionState === 'connected' ? t('connected') : t('notConnected')}</div></section>
		${list.length ? `<div class="transfer-list">${list.map((item) => transferCard(item)).join('')}</div>` : `<div class="empty-state"><div class="empty-state-icon">${icons.transfer}</div><h2>${t('noTransfers')}</h2><button class="button button-primary" data-page="connect">${t('createConnection')}</button></div>`}`;
}

function transferCard(item) {
	const progress = item.size ? Math.min(100, Math.round(item.transferred / item.size * 100)) : (item.status === 'complete' ? 100 : 0);
	const duration = item.startedAt ? Math.max((Date.now() - item.startedAt) / 1000, 0.1) : 0;
	const speed = duration ? item.transferred / duration : 0;
	const remaining = speed && item.size > item.transferred ? Math.ceil((item.size - item.transferred) / speed) : 0;
	const statusLabel = t(item.status) || item.status;
	return `<article class="transfer-card ${item.status === 'failed' ? 'transfer-failed' : ''}"><div class="transfer-file-icon">${fileGlyph(item.name)}</div><div class="transfer-main"><div class="transfer-title-row"><strong>${escapeHtml(item.name)}</strong><span class="transfer-status ${item.status}">${escapeHtml(statusLabel)}</span></div><div class="transfer-subtitle">${formatBytes(item.size)} · ${item.direction === 'send' ? t('sending') : t('receiving')}</div>
		${['sending', 'receiving'].includes(item.status) ? `<div class="progress-track"><span style="width:${progress}%"></span></div><div class="progress-details"><span>${progress}% · ${formatBytes(item.transferred)} / ${formatBytes(item.size)}</span><span>${t('speed')} ${formatBytes(speed)}/s${remaining ? ` · ${remaining}s ${t('remaining')}` : ''}</span></div>` : ''}
		${item.error ? `<p class="error-message">${escapeHtml(item.error)}</p>` : ''}
		${item.status === 'pending' ? `<div class="transfer-controls"><button class="button button-primary button-small" data-action="accept" data-id="${item.id}">${t('accept')}</button><button class="button button-quiet button-small" data-action="reject" data-id="${item.id}">${t('reject')}</button></div>` : ''}
		${item.status === 'complete' && item.direction === 'receive' && item.blob ? `<button class="button button-secondary button-small" data-action="download" data-id="${item.id}">${t('download')}</button>` : ''}
		${!['complete', 'cancelled', 'failed', 'rejected'].includes(item.status) && item.status !== 'pending' ? `<button class="text-button cancel-transfer" data-action="cancel" data-id="${item.id}">${t('cancel')}</button>` : ''}
		</div></article>`;
}

function renderHistory() {
	return `<section class="page-heading"><div><div class="eyebrow">${t('navHistory')}</div><h1>${t('historyTitle')}</h1><p class="page-description">${t('historySubtitle')}</p></div>${state.history.length ? `<button class="button button-quiet" data-action="clear-history">${t('clearHistory')}</button>` : ''}</section>
	${state.history.length ? `<div class="history-list">${state.history.map((item) => `<article class="history-row"><div class="history-file-icon">${fileGlyph(item.name)}</div><div class="history-meta"><strong>${escapeHtml(item.name)}</strong><small>${item.direction === 'send' ? t('sending') : t('receiving')} · ${formatDate(item.timestamp)}</small></div><span>${formatBytes(item.size)}</span><span class="history-check">✓</span></article>`).join('')}</div>` : `<div class="empty-state"><div class="empty-state-icon">${icons.history}</div><h2>${t('noHistory')}</h2></div>`}`;
}

function renderSettings() {
	return `<section class="page-heading"><div><div class="eyebrow">${t('navSettings')}</div><h1>${t('settingsTitle')}</h1><p class="page-description">${t('settingsSubtitle')}</p></div></section>
	<div class="settings-grid"><section class="panel settings-panel"><div class="settings-symbol">${icons.settings}</div><div class="settings-copy"><h2>${t('appearance')}</h2><p>${t('theme')}</p></div><div class="segmented-control"><button class="${state.theme === 'light' ? 'selected' : ''}" data-setting="theme" data-value="light">${t('light')}</button><button class="${state.theme === 'dark' ? 'selected' : ''}" data-setting="theme" data-value="dark">${t('dark')}</button></div></section>
	<section class="panel settings-panel"><div class="settings-symbol language-symbol">文</div><div class="settings-copy"><h2>${t('language')}</h2><p>${state.language === 'ar' ? t('arabic') : t('english')}</p></div><div class="segmented-control"><button class="${state.language === 'en' ? 'selected' : ''}" data-setting="language" data-value="en">EN</button><button class="${state.language === 'ar' ? 'selected' : ''}" data-setting="language" data-value="ar">ع</button></div></section>
	<section class="panel settings-panel full-setting"><div class="settings-symbol offline-symbol">✓</div><div class="settings-copy"><h2>${t('offline')}</h2><p>${t('offlineText')}</p></div></section></div>
	<div class="notice notice-warning limitation-notice"><span class="notice-symbol">!</span><p><strong>${t('limitations')}</strong><br>${t('limitationText')}</p></div>`;
}

function recentItem(item) {
	return `<div class="recent-item"><div class="recent-file-icon">${fileGlyph(item.name)}</div><div class="recent-meta"><strong>${escapeHtml(item.name)}</strong><small>${formatDate(item.completedAt)}</small></div><span class="recent-size">${formatBytes(item.size)}</span><span class="recent-check">✓</span></div>`;
}

function fileGlyph(name) {
	const extension = name.includes('.') ? name.split('.').pop().slice(0, 3).toUpperCase() : 'FILE';
	return `<span class="extension-glyph">${escapeHtml(extension)}</span>`;
}

function activeCount() {
	return [...(state.transfers?.transfers.values() || [])].filter((item) => ['pending', 'waiting', 'accepted', 'sending', 'receiving'].includes(item.status)).length;
}

function bindEvents() {
	document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => {
		state.page = button.dataset.page;
		render();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}));
	document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => runAction(button).catch(showError)));
	document.querySelectorAll('[data-setting]').forEach((button) => button.addEventListener('click', () => {
		const { setting, value } = button.dataset;
		state[setting] = value;
		setPreference(setting, value).catch(showError);
		render();
	}));
	document.querySelector('#file-input')?.addEventListener('change', (event) => addFiles(event.target.files));
	document.querySelector('#folder-input')?.addEventListener('change', (event) => addFiles(event.target.files));
	document.querySelector('#file-search')?.addEventListener('input', (event) => {
		state.search = event.target.value;
		const cursor = event.target.selectionStart;
		render();
		const input = document.querySelector('#file-search');
		input.focus();
		input.setSelectionRange(cursor, cursor);
	});
	document.querySelector('#sort-select')?.addEventListener('change', (event) => {
		state.sort = event.target.value;
		render();
	});
	const dropZone = document.querySelector('#drop-zone');
	if (dropZone) {
		for (const name of ['dragenter', 'dragover']) dropZone.addEventListener(name, (event) => {
			event.preventDefault();
			dropZone.classList.add('drag-over');
		});
		for (const name of ['dragleave', 'drop']) dropZone.addEventListener(name, (event) => {
			event.preventDefault();
			dropZone.classList.remove('drag-over');
		});
		dropZone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
	}
}

async function runAction(button) {
	const action = button.dataset.action;
	if (action === 'create-offer') await createOffer();
	else if (action === 'create-answer') await createAnswer();
	else if (action === 'apply-answer') await applyAnswer();
	else if (action === 'copy') await copyText(button.dataset.target);
	else if (action === 'close-peer') closePeer();
	else if (action === 'go-files') navigateToFiles();
	else if (action === 'open-files') document.querySelector('#file-input')?.click();
	else if (action === 'clear-files') { state.files = []; render(); }
	else if (action === 'remove-file') { state.files.splice(Number(button.dataset.index), 1); render(); }
	else if (action === 'send-files') {
		if (state.connectionState !== 'connected') throw new Error(t('notConnected'));
		await state.transfers.sendFiles(state.files);
		state.files = [];
		navigateToTransfers();
	}
	else if (action === 'accept') await state.transfers.accept(button.dataset.id);
	else if (action === 'reject') state.transfers.reject(button.dataset.id);
	else if (action === 'cancel') state.transfers.cancel(button.dataset.id);
	else if (action === 'download') downloadTransfer(button.dataset.id);
	else if (action === 'preview') previewFile(Number(button.dataset.index));
	else if (action === 'clear-history') {
		await clearHistory();
		state.history = [];
		render();
	}
	else if (action === 'install') {
		state.installPrompt.prompt();
		await state.installPrompt.userChoice;
		state.installPrompt = null;
		render();
	}
}

function createManager() {
	state.transfers = new TransferManager(() => {
		if (!state.peer) throw new Error(t('notConnected'));
		return state.peer;
	}, (transfer) => {
		render();
		if (transfer.status === 'complete') {
			if (transfer.direction === 'receive') notifyComplete(transfer);
			loadHistory().catch(showError);
		}
	});
}

async function createOffer() {
	closePeer(false);
	state.connectionState = 'creating';
	const peer = new PeerConnection(
		(data) => state.transfers.handleMessage(data).catch((error) => {
			showError(error);
			state.transfers.failReceive(error).catch(showError);
		}),
		(connectionState) => updateConnectionState(connectionState)
	);
	state.peer = peer;
	createManager();
	render();
	state.offer = await peer.createOffer();
	showToast(t('offerCreated'));
	render();
}

async function createAnswer() {
	const offer = document.querySelector('#offer-input')?.value || '';
	closePeer(false);
	state.connectionState = 'creating';
	const peer = new PeerConnection(
		(data) => state.transfers.handleMessage(data).catch((error) => {
			showError(error);
			state.transfers.failReceive(error).catch(showError);
		}),
		(connectionState) => updateConnectionState(connectionState)
	);
	state.peer = peer;
	createManager();
	render();
	state.answer = await peer.acceptOffer(offer);
	showToast(t('answerCreated'));
	render();
}

async function applyAnswer() {
	if (!state.peer || !state.offer) throw new Error('Create an offer before applying an answer.');
	const answer = document.querySelector('#answer-input')?.value || '';
	await state.peer.acceptAnswer(answer);
	state.connectionState = 'connecting';
	render();
}

function updateConnectionState(connectionState) {
	if (connectionState === 'connected') {
		state.connectionState = 'connected';
		showToast(t('connectionMade'));
	} else if (connectionState === 'failed') {
		state.connectionState = 'failed';
		showError(new Error(t('connectionFailed')));
	} else if (connectionState === 'disconnected' || connectionState === 'closed') {
		state.connectionState = 'disconnected';
	} else {
		state.connectionState = connectionState;
	}
	render();
}

function closePeer(clearCodes = true) {
	state.peer?.close();
	state.peer = null;
	state.transfers = new TransferManager(() => {
		if (!state.peer) throw new Error(t('notConnected'));
		return state.peer;
	}, (transfer) => {
		render();
		if (transfer.status === 'complete') loadHistory().catch(showError);
	});
	state.connectionState = 'idle';
	if (clearCodes) {
		state.offer = '';
		state.answer = '';
	}
	render();
}

function navigateToFiles() {
	state.page = 'files';
	render();
}

function navigateToTransfers() {
	state.page = 'transfers';
	render();
}

async function copyText(id) {
	const value = document.querySelector(`#${id}`)?.value;
	if (!value) return;
	if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser. Select and copy the connection data manually.');
	await navigator.clipboard.writeText(value);
	showToast(t('copied'));
}

function addFiles(fileList) {
	const incoming = Array.from(fileList || []);
	for (const file of incoming) {
		if (!state.files.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) {
			state.files.push(file);
		}
	}
	render();
}

function downloadTransfer(id) {
	const transfer = state.transfers.transfers.get(id);
	if (!transfer?.blob) throw new Error('This received file is not available in this session.');
	const url = URL.createObjectURL(transfer.blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = transfer.name;
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function previewFile(index) {
	const file = state.files[index];
	if (!file) return;
	if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
	state.previewUrl = URL.createObjectURL(file);
	const content = file.type.startsWith('image/')
		? `<img class="preview-image" src="${state.previewUrl}" alt="${escapeHtml(file.name)}">`
		: file.type.startsWith('video/')
			? `<video class="preview-video" src="${state.previewUrl}" controls></video>`
			: file.type === 'application/pdf'
				? `<iframe class="preview-pdf" src="${state.previewUrl}" title="${escapeHtml(file.name)}"></iframe>`
				: `<p>${t('previewUnsupported')}</p>`;
	document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="preview-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(file.name)}"><div class="modal-heading"><strong>${escapeHtml(file.name)}</strong><button class="icon-button" data-action="close-modal" aria-label="${t('close')}">×</button></div>${content}</section></div>`;
	document.querySelectorAll('[data-action="close-modal"]').forEach((element) => element.addEventListener('click', (event) => {
		if (event.target === element || event.currentTarget.tagName === 'BUTTON') {
			document.querySelector('#modal-root').innerHTML = '';
			URL.revokeObjectURL(state.previewUrl);
			state.previewUrl = null;
		}
	}));
}

function showToast(message) {
	const root = document.querySelector('#toast-root');
	if (!root) return;
	root.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
	setTimeout(() => { if (root) root.innerHTML = ''; }, 3200);
}

function showError(error) {
	console.error(error);
	const root = document.querySelector('#toast-root');
	if (!root) return;
	root.innerHTML = `<div class="toast toast-error"><strong>${t('errorTitle')}</strong><span>${escapeHtml(error?.message || String(error))}</span></div>`;
	setTimeout(() => { if (root) root.innerHTML = ''; }, 6000);
}

async function notifyComplete(transfer) {
	if (!('Notification' in window) || Notification.permission !== 'granted') return;
	try {
		new Notification(t('notificationTitle'), {
			body: `${transfer.name} — ${t('notificationText')}`,
			icon: '/icon.svg'
		});
	} catch (error) {
		console.warn('Could not show a transfer notification.', error);
	}
}

async function loadHistory() {
	state.history = await getHistory();
	if (state.page === 'history' || state.page === 'home') render();
}

async function initialize() {
	try {
		state.language = await getPreference('language', 'en');
		state.theme = await getPreference('theme', 'light');
		state.history = await getHistory();
	} catch (error) {
		showError(error);
	}
	render();
	if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
		navigator.serviceWorker.register('/sw.js').catch(showError);
	}
	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		state.installPrompt = event;
		render();
	});
}

initialize();
