(function() {
    // Создаем контейнер для нашего окна и позиционируем его с отступом от правого верхнего угла
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "50px";
    container.style.right = "50px";
    container.style.zIndex = "10000";
    document.body.appendChild(container);

    // Создаем Shadow DOM для изоляции стилей нашего окна
    const shadow = container.attachShadow({ mode: "open" });

    // Добавляем стили. Изменив значение переменной --global-font-size, можно менять размер текста для всего расширения.
    const style = document.createElement("style");
    style.textContent = `
    :host {
      --global-font-size: 19px; /* Измените это значение для регулировки размера текста */
    }
    #extWindow {
      background: #333;
      color: #fff;
      padding: 10px;
      display: inline-block;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.6);
      width: auto;
      font-size: var(--global-font-size);
    }
    #extHeader {
      cursor: move;
      font-weight: bold;
      margin-bottom: 8px;
      font-size: calc(var(--global-font-size) + 2px);
    }
    .error-button {
      display: block;          /* Кнопки располагаются вертикально */
      background: #555;
      color: #fff;
      border: none;
      padding: 6px 10px;
      cursor: pointer;
      border-radius: 3px;
      font-size: var(--global-font-size);
      margin-bottom: 5px;
      width: 100%;
      text-align: left;        /* Текст выровнен по левому краю */
    }
    .error-button:hover {
      background: #666;
    }
    .error-button.active {
      background: red;
    }
    #applyBtn {
      background: #555;
      color: #fff;
      border: none;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 3px;
      font-size: var(--global-font-size);
      display: block;
      width: 100%;
      margin-bottom: 8px;
    }
    #applyBtn:hover {
      background: #666;
    }
    hr.separator {
      border: none;
      border-top: 1px solid #fff;
      margin: 8px 0;
    }
    /* Стили для поля ввода собственного комментария */
    #customComment {
      width: 100%;
      height: 80px;
      font-size: var(--global-font-size);
      margin-top: 8px;
      padding: 4px;
      border-radius: 3px;
      border: 1px solid #555;
      background: #444;
      color: #fff;
      resize: vertical;
    }
  `;
    shadow.appendChild(style);

    // Создаем разметку окна.
    // Кнопка "Применить" находится вверху, затем заголовок "Ошибки", блок с кнопками ошибок и поле для ввода собственного комментария.
    const extWindow = document.createElement("div");
    extWindow.id = "extWindow";
    extWindow.innerHTML = `
    <button id="applyBtn">Применить</button>
    <div id="extHeader">Ошибки</div>
    <div id="chkContainer">Загрузка...</div>
    <textarea id="customComment" placeholder="Напиши, в чем он не прав!"></textarea>
  `;
    shadow.appendChild(extWindow);

    // Делаем окно перетаскиваемым за заголовок
    (function makeDraggable(el) {
        const header = el.querySelector("#extHeader");
        let isDragging = false, offsetX, offsetY;
        header.addEventListener("mousedown", function(e) {
            isDragging = true;
            offsetX = e.clientX - el.getBoundingClientRect().left;
            offsetY = e.clientY - el.getBoundingClientRect().top;
        });
        document.addEventListener("mousemove", function(e) {
            if (isDragging) {
                container.style.left = (e.clientX - offsetX) + "px";
                container.style.top = (e.clientY - offsetY) + "px";
            }
        });
        document.addEventListener("mouseup", function() {
            isDragging = false;
        });
    })(extWindow);

    let lastTaskNumber = null;

    /**
     * Обновление кнопок ошибок для активного студента.
     * Поиск заголовка задания и ревью производится внутри текущего активного слайда (.carousel-item.active).
     */
    function updateErrorButtons() {
        const containerEl = shadow.getElementById("chkContainer");
        const activeItem = document.querySelector(".carousel-inner .carousel-item.active");
        if (!activeItem) {
            containerEl.innerHTML = "<em>Активный слайд не найден</em>";
            return;
        }
        const taskHeader = activeItem.querySelector("h3");
        if (!taskHeader) {
            containerEl.innerHTML = "<em>Заголовок задания не найден</em>";
            return;
        }
        const taskNum = taskHeader.textContent.trim();
        console.log("Task number:", taskNum);
        if (taskNum === lastTaskNumber) return;
        lastTaskNumber = taskNum;

        // Глобальный заголовок ревью (из .code-review-page-header h3)
        const globalReviewHeader = document.querySelector(".code-review-page-header h3");
        const reviewText = globalReviewHeader ? globalReviewHeader.textContent.trim() : "";
        console.log("Review text:", reviewText);

        const commonItems = window.commonErrors || [];
        const reviewErrors = (window.taskErrors && window.taskErrors[reviewText]) || {};
        const specificItems = reviewErrors[taskNum] || [];

        console.log("Common items:", commonItems);
        console.log("Specific items:", specificItems);

        containerEl.innerHTML = "";

        // Функция для создания кнопки ошибки
        function createErrorButton(err) {
            const btn = document.createElement("button");
            btn.className = "error-button";
            btn.dataset.text = err.text;
            btn.textContent = err.label;
            // При клике переключаем состояние: если нажата — активная кнопка (красный фон)
            btn.addEventListener("click", function() {
                btn.classList.toggle("active");
            });
            return btn;
        }

        // Выводим сначала общие ошибки как кнопки
        commonItems.forEach(err => {
            const btn = createErrorButton(err);
            containerEl.appendChild(btn);
        });

        // Если есть и общие, и специфичные ошибки – добавляем разделитель
        if (commonItems.length > 0 && specificItems.length > 0) {
            const hr = document.createElement("hr");
            hr.className = "separator";
            containerEl.appendChild(hr);
        }

        // Выводим специфичные ошибки как кнопки
        specificItems.forEach(err => {
            const btn = createErrorButton(err);
            containerEl.appendChild(btn);
        });
    }

    // Обновляем кнопки ошибок каждые 500 мс
    setInterval(updateErrorButtons, 500);

    /**
     * Обработчик кнопки "Применить"
     * Собираем текст активных кнопок ошибок, добавляем собственный комментарий из поля customComment,
     * вставляем получившийся текст в поле ввода (textarea) внутри активного слайда,
     * генерируем событие input, кликаем по кнопке "Отправить комментарий",
     * и через небольшую задержку переключаемся на следующую задачу.
     */
    shadow.getElementById("applyBtn").addEventListener("click", function() {
        const activeItem = document.querySelector(".carousel-inner .carousel-item.active");
        if (!activeItem) {
            console.error("Активный слайд не найден");
            return;
        }

        // Ищем поле для комментария внутри активного слайда
        const errorField = activeItem.querySelector(".form-control.form-control-area");
        // Получаем все кнопки-ошибки из нашего окна (Shadow DOM)
        const errorButtons = shadow.querySelectorAll("#chkContainer .error-button");
        // Получаем поле для собственного комментария из нашего расширения
        const customCommentField = shadow.getElementById("customComment");

        if (errorField) {
            let newText = "";
            errorButtons.forEach(btn => {
                if (btn.classList.contains("active")) {
                    newText += btn.dataset.text + "\n";
                }
            });
            // Если пользователь ввёл собственный комментарий, добавляем его в конец с символом "# "
            if (customCommentField) {
                const customText = customCommentField.value.trim();
                if (customText !== "") {
                    newText += "# " + customText + "\n";
                }
                // Очищаем поле собственного комментария после применения
                customCommentField.value = "";
            }
            errorField.value = newText;
            const inputEvent = new Event("input", { bubbles: true });
            errorField.dispatchEvent(inputEvent);
        } else {
            console.error("Поле .form-control.form-control-area не найдено в активном слайде!");
        }

        // Ищем кнопку "Отправить комментарий" внутри активного слайда
        const sendBtn = activeItem.querySelector("button.btn.btn-info");
        if (sendBtn) {
            sendBtn.click();
        } else {
            console.log('Кнопка "Отправить комментарий" не найдена в активном слайде.');
        }

        // С задержкой переключаемся на следующую задачу внутри активного слайда
        setTimeout(() => {
            const currentTask = activeItem.querySelector('.code-review-tasks-list .student-task.current-task');
            if (currentTask) {
                const nextTask = currentTask.nextElementSibling;
                if (nextTask) {
                    nextTask.click();
                } else {
                    console.log("Следующая задача не найдена.");
                }
            } else {
                console.log("Текущая задача не найдена в активном слайде.");
            }
        }, 300);
    });
})();
