/* ============================================================
   Widget de quiz compartido para las lecciones de contabilidad.
   Uso en el HTML:

   <div class="quiz" data-answer="1">
     <div class="q-num">Pregunta 1</div>
     <div class="q-text">¿...?</div>
     <button class="opt">Opción A</button>
     <button class="opt">Opción B</button>
     <div class="feedback ok"   data-for="ok">¡Correcto! ...</div>
     <div class="feedback no"   data-for="no">No exactamente. ...</div>
   </div>

   - data-answer = índice (base 0) de la opción correcta.
   - Retroalimentación inmediata; una sola oportunidad por pregunta,
     pero se resalta cuál era la correcta (aprendizaje por recuperación).
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.quiz').forEach(function (quiz) {
    var answer = parseInt(quiz.getAttribute('data-answer'), 10);
    var opts = Array.prototype.slice.call(quiz.querySelectorAll('.opt'));
    var fbOk = quiz.querySelector('.feedback.ok');
    var fbNo = quiz.querySelector('.feedback.no');

    opts.forEach(function (opt, i) {
      opt.addEventListener('click', function () {
        if (quiz.dataset.done) return;
        quiz.dataset.done = '1';
        opts.forEach(function (o) { o.disabled = true; });
        opts[answer].classList.add('correct');
        if (i === answer) {
          if (fbOk) fbOk.classList.add('show');
        } else {
          opt.classList.add('wrong');
          if (fbNo) fbNo.classList.add('show');
        }
      });
    });
  });

  /* Verificador de la ecuación contable (tarea interactiva).
     Un botón .check-btn con data-target apuntando a un contenedor
     que tenga inputs .blank con data-expect. */
  document.querySelectorAll('.check-btn[data-target]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = document.getElementById(btn.getAttribute('data-target'));
      if (!box) return;
      var blanks = Array.prototype.slice.call(box.querySelectorAll('input.blank'));
      var out = box.querySelector('.feedback');
      var allOk = blanks.every(function (b) {
        var expect = parseFloat(b.getAttribute('data-expect'));
        var got = parseFloat(String(b.value).replace(/[, ]/g, ''));
        var ok = got === expect;
        b.style.borderBottomColor = ok ? '#1f5130' : '#7a1f1f';
        return ok;
      });
      if (out) {
        out.className = 'feedback ' + (allOk ? 'ok show' : 'no show');
        out.textContent = allOk
          ? '¡Cuadra! Activo = Pasivo + Patrimonio se cumple. Ese es el corazón de la contabilidad.'
          : 'Todavía no cuadra. Recuerda: lo que la empresa tiene (Activo) debe ser igual a lo que debe (Pasivo) más lo que es suyo (Patrimonio). Ajusta los valores.';
      }
    });
  });
});
