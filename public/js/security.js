// Защита от записи экрана и скриншотов
// Загружается немедленно, до загрузки DOM

// Блокировка до загрузки DOM
(function() {
    'use strict';
    
    // Немедленная блокировка контекстного меню
    if (document.addEventListener) {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
        
        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
        }, true);
        
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        }, true);
    }
    
    // Блокировка клавиш до загрузки
    if (document.addEventListener) {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'PrintScreen' || 
                e.key === 'F12' ||
                (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && (e.key === 'U' || e.key === 'S'))) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
        }, true);
    }
})();

// Основная защита после загрузки
(function() {
    'use strict';

    // Водяной знак
    function createWatermark() {
        const watermark = document.createElement('div');
        watermark.id = 'security-watermark';
        watermark.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999999;
            background-image: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 100px,
                rgba(255, 0, 0, 0.03) 100px,
                rgba(255, 0, 0, 0.03) 200px
            );
            user-select: none;
        `;
        document.body.appendChild(watermark);
    }

    // Блокировка контекстного меню (правый клик)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showWarning('Контекстное меню заблокировано');
        reportViolation('context_menu', { target: e.target.tagName });
        return false;
    }, false);

    // Блокировка выделения текста
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    }, false);

    // Блокировка перетаскивания
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    }, false);

    // Блокировка горячих клавиш для скриншотов
    document.addEventListener('keydown', function(e) {
        // Windows: Print Screen, Win + Print Screen, Alt + Print Screen
        // Mac: Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5
        // Блокировка F12 (DevTools)
        
        if (e.key === 'PrintScreen' || 
            (e.key === 'F12') ||
            (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C') ||
            (e.ctrlKey && e.key === 'U') ||
            (e.ctrlKey && e.key === 'S')) {
            e.preventDefault();
            showWarning('Эта функция заблокирована');
            return false;
        }
    }, false);

    // Блокировка комбинаций клавиш
    document.addEventListener('keydown', function(e) {
        // Ctrl + Shift + I (DevTools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            showWarning('Открытие инструментов разработчика заблокировано');
            return false;
        }
        // Ctrl + Shift + J (Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            showWarning('Открытие консоли заблокировано');
            return false;
        }
        // Ctrl + Shift + C (Inspect)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            showWarning('Инспектор элементов заблокирован');
            return false;
        }
        // Ctrl + U (View Source)
        if (e.ctrlKey && e.key === 'U') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            showWarning('Просмотр исходного кода заблокирован');
            reportViolation('view_source', { method: 'ctrl_u' });
            // Дополнительная защита - редирект при попытке просмотра исходного кода
            setTimeout(() => {
                window.location.href = window.location.href.split('#')[0];
            }, 100);
            return false;
        }
        // Ctrl + S (Save Page)
        if (e.ctrlKey && e.key === 'S') {
            e.preventDefault();
            showWarning('Сохранение страницы заблокировано');
            return false;
        }
    }, false);

    // Обнаружение записи экрана (Screen Capture API)
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        
        navigator.mediaDevices.getDisplayMedia = function(constraints) {
            showWarning('Запись экрана заблокирована');
            return Promise.reject(new DOMException('Запись экрана заблокирована', 'NotAllowedError'));
        };
    }

    // Обнаружение попыток записи через getDisplayMedia
    if (window.navigator && window.navigator.mediaDevices) {
        const originalGetDisplayMedia = window.navigator.mediaDevices.getDisplayMedia;
        if (originalGetDisplayMedia) {
            window.navigator.mediaDevices.getDisplayMedia = function() {
                showWarning('Запись экрана заблокирована');
                return Promise.reject(new DOMException('Запись экрана заблокирована', 'NotAllowedError'));
            };
        }
    }

    // Блокировка копирования через буфер обмена
    document.addEventListener('copy', function(e) {
        e.clipboardData.setData('text/plain', '');
        e.preventDefault();
        showWarning('Копирование заблокировано');
        reportViolation('copy_attempt', {});
        return false;
    }, false);

    document.addEventListener('cut', function(e) {
        e.clipboardData.setData('text/plain', '');
        e.preventDefault();
        showWarning('Вырезание заблокировано');
        return false;
    }, false);

    // Обнаружение DevTools
    let devtools = {open: false, orientation: null};
    const threshold = 160;
    
    setInterval(function() {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            if (!devtools.open) {
                devtools.open = true;
                showWarning('Инструменты разработчика обнаружены. Пожалуйста, закройте их.');
                reportViolation('devtools_opened', {});
                // Редирект при открытии DevTools
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 2000);
            }
        } else {
            if (devtools.open) {
                devtools.open = false;
            }
        }
    }, 500);

    // Блокировка на мобильных устройствах
    // Предотвращение длительного нажатия (скриншот на iOS)
    let touchStartTime = 0;
    document.addEventListener('touchstart', function(e) {
        touchStartTime = Date.now();
    }, false);

    document.addEventListener('touchend', function(e) {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration > 500) { // Длительное нажатие
            e.preventDefault();
            showWarning('Длительное нажатие заблокировано');
            return false;
        }
    }, false);

    // Блокировка жестов на мобильных
    document.addEventListener('touchmove', function(e) {
        // Блокировка жеста "три пальца вниз" (скриншот на некоторых устройствах)
        if (e.touches.length >= 3) {
            e.preventDefault();
            showWarning('Многопальцевые жесты заблокированы');
            return false;
        }
    }, false);

    // Предотвращение скриншотов через комбинации клавиш на мобильных
    document.addEventListener('keydown', function(e) {
        // Android: Volume Down + Power
        // iOS: Home + Power или Volume Up + Power
        if (e.key === 'Power' || e.key === 'VolumeDown' || e.key === 'VolumeUp') {
            showWarning('Скриншот заблокирован');
        }
    }, false);

    // CSS для блокировки выделения
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent !important;
        }
        
        input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
        
        img {
            -webkit-user-drag: none !important;
            -khtml-user-drag: none !important;
            -moz-user-drag: none !important;
            -o-user-drag: none !important;
            user-drag: none !important;
            pointer-events: none !important;
        }
        
        body {
            -webkit-touch-callout: none !important;
        }
    `;
    document.head.appendChild(style);

    // Функция отправки нарушения на сервер
    function reportViolation(violationType, details) {
        try {
            fetch('/api/security/violation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    violationType: violationType,
                    details: details || {}
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.violationCount >= 5) {
                    showWarning('Превышен лимит нарушений! Доступ будет заблокирован.');
                    setTimeout(() => {
                        window.location.href = '/auth/login';
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Ошибка отправки нарушения:', error);
            });
        } catch (error) {
            console.error('Ошибка отправки нарушения:', error);
        }
    }

    // Функция показа предупреждения
    function showWarning(message) {
        // Удаляем предыдущее предупреждение, если есть
        const existingWarning = document.getElementById('security-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        const warning = document.createElement('div');
        warning.id = 'security-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 1000000;
            font-weight: bold;
            animation: slideIn 0.3s ease-out;
        `;
        warning.textContent = message;
        
        // Анимация появления
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styleSheet);
        
        document.body.appendChild(warning);
        
        // Удаление через 3 секунды
        setTimeout(function() {
            if (warning.parentNode) {
                warning.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(function() {
                    warning.remove();
                }, 300);
            }
        }, 3000);
    }

    // Создание водяного знака при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWatermark);
    } else {
        createWatermark();
    }

    // Дополнительная защита: обнаружение изменения размера окна (DevTools)
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    
    setInterval(function() {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        
        if (Math.abs(currentWidth - lastWidth) > 100 || 
            Math.abs(currentHeight - lastHeight) > 100) {
            showWarning('Обнаружено изменение размера окна');
        }
        
        lastWidth = currentWidth;
        lastHeight = currentHeight;
    }, 1000);

    // Блокировка консоли
    const noop = function() {};
    const methods = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml', 
                     'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];
    
    methods.forEach(function(method) {
        if (window.console && window.console[method]) {
            window.console[method] = noop;
        }
    });

    console.log('%cСТОП!', 'font-size: 50px; color: red; font-weight: bold;');
    console.log('%cЭто функция браузера, предназначенная для разработчиков. Если кто-то попросил вас вставить здесь код, это мошенничество.', 'font-size: 16px;');

})();

