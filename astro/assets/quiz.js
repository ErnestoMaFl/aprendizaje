/* ===========================================================================
   quiz.js — widget de quiz reutilizable para las lecciones de Astro
   ---------------------------------------------------------------------------
   Principios pedagógicos que implementa (ver PEDAGOGY.md):
   - Intento ANTES del feedback: el botón "Comprobar" exige respuesta + confianza.
   - Formatos mixtos: opción múltiple (mc), respuesta corta (short), evocación
     libre auto-evaluada (recall).
   - Captura de confianza por pregunta: seguro / inseguro / adivinando.
   - Feedback elaborado: explica POR QUÉ, no solo si acertaste.
   - Al final resume las banderas de calibración (fallo+seguro, acierto+adivinando)
     para que el alumno se las reporte al profesor y vayan a la cola de repaso.

   Uso en una lección:
     <div id="quiz"></div>
     <div id="hoja"></div>
     <script src="../assets/quiz.js"></script>
     <script>
       TeachQuiz.render('quiz', [ ...preguntas... ]);
       TeachQuiz.answerSheet('hoja', { titulo: 'Lección N · Nombre' });
     </script>

   Hoja de respuestas: acumula los resultados del quiz (respuesta + resultado +
   confianza) y el contenido de todo <textarea class="open-answer"
   data-label="Nombre de la tarea"> de la página, en un bloque de texto con botón
   «copiar para el chat». El alumno lo pega en el chat de una sola vez.

   Forma de una pregunta:
     {
       type: 'mc' | 'short' | 'recall',
       prompt: 'HTML de la pregunta',
       options: ['a','b','c'],        // solo mc
       answer: 1,                     // mc: índice correcto
       accept: ['props','astro.props'],// short: cadenas aceptadas (minúsculas)
       model: 'texto de la respuesta modelo', // short/recall: para auto-evaluar
       feedback: 'HTML — por qué esa respuesta es la correcta'
     }
   =========================================================================== */
(function () {
  const CONF = [
    { id: 'sure',  label: 'Seguro' },
    { id: 'unsure', label: 'Inseguro' },
    { id: 'guess', label: 'Adivinando' },
  ];

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function normalize(s) {
    return (s || '').trim().toLowerCase().replace(/[.,;:!?]+$/, '');
  }

  const CONF_LABEL = { sure: 'seguro', unsure: 'inseguro', guess: 'adivinando' };
  const registry = []; // resultados de todos los quizzes de la página, en orden

  function plain(html) {
    const t = document.createElement('div');
    t.innerHTML = html;
    return (t.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function render(containerId, questions) {
    const root = document.getElementById(containerId);
    if (!root) return;
    root.classList.add('quiz');
    const state = questions.map(() => ({ answered: false, correct: null, conf: null }));
    const log = questions.map((q, i) => ({
      num: i + 1, type: q.type, prompt: plain(q.prompt),
      answer: null, correct: null, conf: null,
    }));
    registry.push(log);

    questions.forEach((q, i) => {
      const card = el('div', 'q-card');
      card.appendChild(el('div', 'q-num', 'Pregunta ' + (i + 1)));
      card.appendChild(el('div', 'q-prompt', q.prompt));

      const body = el('div', 'q-body');

      // --- Zona de respuesta según tipo ---
      let getAnswer = () => null;
      if (q.type === 'mc') {
        const list = el('div', 'q-options');
        q.options.forEach((opt, oi) => {
          const id = containerId + '-q' + i + '-o' + oi;
          const wrap = el('label', 'q-opt');
          const radio = el('input');
          radio.type = 'radio'; radio.name = containerId + '-q' + i; radio.value = oi; radio.id = id;
          wrap.appendChild(radio);
          wrap.appendChild(el('span', null, opt));
          list.appendChild(wrap);
        });
        body.appendChild(list);
        getAnswer = () => {
          const c = list.querySelector('input:checked');
          return c ? Number(c.value) : null;
        };
      } else {
        const input = el(q.type === 'recall' ? 'textarea' : 'input', 'q-input');
        if (q.type === 'recall') input.rows = 3;
        input.placeholder = q.type === 'recall'
          ? 'Escribe de memoria todo lo que recuerdes…'
          : 'Tu respuesta…';
        body.appendChild(input);
        getAnswer = () => input.value;
      }

      // --- Confianza ---
      const confRow = el('div', 'q-conf');
      confRow.appendChild(el('span', 'q-conf-label', 'Confianza:'));
      CONF.forEach(c => {
        const b = el('button', 'q-conf-btn');
        b.type = 'button'; b.textContent = c.label; b.dataset.conf = c.id;
        b.addEventListener('click', () => {
          confRow.querySelectorAll('.q-conf-btn').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
          state[i].conf = c.id;
        });
        confRow.appendChild(b);
      });
      body.appendChild(confRow);

      // --- Botón comprobar + feedback ---
      const check = el('button', 'q-check');
      check.type = 'button'; check.textContent = 'Comprobar';
      const fb = el('div', 'q-feedback');
      fb.style.display = 'none';

      check.addEventListener('click', () => {
        if (state[i].answered) return;
        if (!state[i].conf) { flash(check, 'Elige tu confianza primero'); return; }
        const ans = getAnswer();
        let correct = null; // null = auto-evaluado (recall / short sin lista)
        let verdict = '';

        if (q.type === 'mc') {
          if (ans == null) { flash(check, 'Selecciona una opción'); return; }
          correct = (ans === q.answer);
          verdict = correct ? '✓ Correcto' : '✗ No exactamente';
        } else if (q.type === 'short') {
          if (!normalize(ans)) { flash(check, 'Escribe una respuesta'); return; }
          correct = (q.accept || []).some(a => normalize(ans).includes(normalize(a)));
          verdict = correct ? '✓ Correcto' : '✗ Revisa la respuesta modelo';
        } else { // recall
          if (!normalize(ans)) { flash(check, 'Escribe algo de memoria'); return; }
          verdict = '↻ Compara con la versión modelo y evalúate';
        }

        state[i].answered = true;
        state[i].correct = correct;
        log[i].answer = (q.type === 'mc') ? plain(q.options[ans]) : String(ans).trim();
        log[i].correct = correct;
        log[i].conf = state[i].conf;

        let html = '<div class="fb-verdict">' + verdict + '</div>';
        if (q.model) html += '<div class="fb-model"><strong>Respuesta modelo:</strong> ' + q.model + '</div>';
        if (q.feedback) html += '<div class="fb-why">' + q.feedback + '</div>';

        // Aviso de confianza (cuando confianza y resultado no cuadran)
        if (correct === false && state[i].conf === 'sure')
          html += '<div class="fb-flag">⚑ Fallaste diciendo «seguro»: conviene repasarlo. Repórtaselo al profesor.</div>';
        if (correct === true && state[i].conf === 'guess')
          html += '<div class="fb-flag">⚑ Acertaste diciendo «adivinando»: aún es frágil, también conviene repasarlo.</div>';

        fb.innerHTML = html;
        fb.style.display = 'block';
        check.disabled = true;
        check.textContent = 'Respondida';
        maybeSummary();
      });

      body.appendChild(check);
      body.appendChild(fb);
      card.appendChild(body);
      root.appendChild(card);
    });

    // --- Resumen final ---
    const summary = el('div', 'q-summary');
    summary.style.display = 'none';
    root.appendChild(summary);

    function maybeSummary() {
      if (!state.every(s => s.answered)) return;
      const scored = state.filter(s => s.correct !== null);
      const right = scored.filter(s => s.correct).length;
      const flags = state.filter(s =>
        (s.correct === false && s.conf === 'sure') ||
        (s.correct === true && s.conf === 'guess')).length;
      let html = '<h3>Resumen</h3><p>Preguntas que el sistema corrige solo (opción ' +
        'múltiple y respuesta corta): <strong>' + right + ' / ' + scored.length +
        '</strong> correctas.';
      if (state.length > scored.length)
        html += ' Además, ' + (state.length - scored.length) + ' pregunta(s) de ' +
          'escribir de memoria: esas las valoras tú comparando con la respuesta modelo.';
      html += '</p>';
      html += flags
        ? '<p class="fb-flag">Tienes ' + flags + ' aviso(s) de confianza (tu seguridad no ' +
          'cuadró con el resultado). Repórtaselos al profesor para programar su repaso.</p>'
        : '<p>Ningún aviso de confianza: tu seguridad cuadró con tus resultados. 👍 ' +
          'Cuéntale al profesor cómo te fue.</p>';
      summary.innerHTML = html;
      summary.style.display = 'block';
    }
  }

  function flash(btn, msg) {
    const prev = btn.textContent;
    btn.textContent = msg;
    btn.classList.add('q-nudge');
    setTimeout(() => { btn.textContent = prev; btn.classList.remove('q-nudge'); }, 1400);
  }

  /* --- Hoja de respuestas ------------------------------------------------ */
  function buildSheetText(titulo) {
    const lines = ['HOJA DE RESPUESTAS — ' + (titulo || document.title)];
    lines.push('Fecha: ' + new Date().toLocaleDateString());
    let pending = 0;

    registry.forEach(log => {
      lines.push('', '— QUIZ —');
      log.forEach(e => {
        if (e.answer == null) { pending++; return; }
        const tipo = { mc: 'opción múltiple', short: 'respuesta corta', recall: 'de memoria' }[e.type] || e.type;
        const res = e.correct === true ? '✓ correcta'
                  : e.correct === false ? '✗ incorrecta'
                  : 'me autoevalúo comparando con el modelo';
        lines.push('P' + e.num + ' · ' + tipo + ' · confianza: ' + (CONF_LABEL[e.conf] || '—') + ' · ' + res);
        lines.push('   Pregunta: ' + e.prompt);
        lines.push('   Mi respuesta: «' + e.answer + '»');
      });
    });

    const abiertas = document.querySelectorAll('.open-answer');
    if (abiertas.length) {
      lines.push('', '— RESPUESTAS ABIERTAS —');
      abiertas.forEach(t => {
        const v = (t.value || '').trim();
        lines.push('[' + (t.dataset.label || 'Respuesta abierta') + ']');
        lines.push(v || '(sin responder)');
        if (!v) pending++;
      });
    }

    if (pending) lines.push('', '(Ojo: ' + pending + ' pregunta(s) aún sin responder.)');
    return lines.join('\n');
  }

  function answerSheet(containerId, opts) {
    const root = document.getElementById(containerId);
    if (!root) return;
    root.classList.add('hoja-respuestas');
    root.innerHTML =
      '<h3>📋 Tu hoja de respuestas</h3>' +
      '<p class="hoja-note">Cuando termines el quiz y las tareas, pulsa el botón: se copia ' +
      'todo lo que respondiste (con tu confianza en cada pregunta) en un solo bloque de ' +
      'texto. Pégalo en el chat con tu profesor para que corrija y programe tus repasos.</p>' +
      '<button type="button" class="hoja-copy">Copiar mis respuestas para el chat</button>' +
      '<pre class="hoja-preview"></pre>';
    const btn = root.querySelector('.hoja-copy');
    const pre = root.querySelector('.hoja-preview');
    btn.addEventListener('click', () => {
      const text = buildSheetText(opts && opts.titulo);
      pre.textContent = text;
      pre.style.display = 'block';
      const done = () => flash(btn, '¡Copiada! Pégala en el chat');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
      } else fallbackCopy(text, done);
    });
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* la vista previa queda visible */ }
    document.body.removeChild(ta);
    done();
  }

  window.TeachQuiz = { render, answerSheet };
})();
