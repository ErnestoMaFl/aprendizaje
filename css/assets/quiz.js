/* quiz.js — widget de quiz + hoja de respuestas copiable, reutilizable.

   QUIZ (retroalimentación inmediata):
   <div class="quiz" data-correcta="1" data-num="2">
     <p class="quiz-pregunta"><span class="quiz-num">Pregunta</span><br>¿...?</p>
     <div class="opciones">
       <button class="opcion">Opción A</button>
       <button class="opcion">Opción B</button>   <- índice 1 = correcta
       <button class="opcion">Opción C</button>
     </div>
     <div class="feedback ok" data-para="ok">¡Correcto! ...</div>
     <div class="feedback no" data-para="no">No exactamente. ...</div>
   </div>
   El botón cuyo índice (base 0) coincide con data-correcta es la respuesta buena.
   Tras responder, el widget pide el nivel de seguridad (seguro/dudoso/adivinando).

   PREGUNTA ABIERTA (misión de lectura, "¿por qué?", etc.):
   <label class="pregunta-abierta">
     <span class="pa-titulo">Misión de lectura: traduce …</span>
     <textarea class="abierta" data-label="Misión de lectura" rows="3"></textarea>
   </label>

   HOJA DE RESPUESTAS (al final de la lección — el usuario la copia y la pega en el chat):
   <div class="hoja-respuestas">
     <p class="hr-intro">…</p>
     <textarea class="hr-salida" readonly rows="10"></textarea>
     <button class="hr-copiar" type="button">Copiar para el chat</button>
     <span class="hr-aviso"></span>
   </div>
   La hoja se rellena sola con cada respuesta (auto-corregida u abierta). */

document.addEventListener('DOMContentLoaded', function () {
  var registros = {};   // idx de quiz -> { pick, correcta, conf }

  function refrescarHoja() {
    var salida = document.querySelector('.hoja-respuestas .hr-salida');
    if (!salida) return;

    var quizzes = Array.prototype.slice.call(document.querySelectorAll('.quiz'));
    var abiertas = Array.prototype.slice.call(document.querySelectorAll('textarea.abierta'));
    var lineas = [];
    lineas.push('📋 ' + (document.title || 'Lección'));
    lineas.push('');

    if (quizzes.length) {
      lineas.push('— Quizzes (auto-corregidos) —');
      quizzes.forEach(function (quiz, i) {
        var num = quiz.getAttribute('data-num') || (i + 1);
        var r = registros[i];
        if (!r) {
          lineas.push('Q' + num + ': (sin responder)');
        } else {
          var marca = r.correcta ? '✔ correcta' : '✘ incorrecta';
          var conf = r.conf ? ' · seguridad: ' + r.conf : '';
          lineas.push('Q' + num + ': ' + marca + ' — elegí «' + r.pick + '»' + conf);
        }
      });
    }

    if (abiertas.length) {
      lineas.push('');
      lineas.push('— Respuestas abiertas —');
      abiertas.forEach(function (ta) {
        var label = ta.getAttribute('data-label') || 'Abierta';
        var val = ta.value.trim();
        lineas.push(label + ': ' + (val || '(vacío)'));
      });
    }

    salida.value = lineas.join('\n');
  }

  // --- Quizzes ---
  document.querySelectorAll('.quiz').forEach(function (quiz, idx) {
    var correcta = parseInt(quiz.getAttribute('data-correcta'), 10);
    var opciones = Array.prototype.slice.call(quiz.querySelectorAll('.opcion'));
    var fbOk = quiz.querySelector('.feedback[data-para="ok"]');
    var fbNo = quiz.querySelector('.feedback[data-para="no"]');

    // Selector de seguridad, inyectado (aparece al responder)
    var conf = document.createElement('div');
    conf.className = 'confianza';
    conf.innerHTML = '<span class="conf-etq">¿Qué tan seguro estabas?</span>' +
      '<button type="button" class="conf-chip" data-conf="seguro">seguro</button>' +
      '<button type="button" class="conf-chip" data-conf="dudoso">dudoso</button>' +
      '<button type="button" class="conf-chip" data-conf="adivinando">adivinando</button>';
    quiz.appendChild(conf);

    conf.querySelectorAll('.conf-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        conf.querySelectorAll('.conf-chip').forEach(function (c) { c.classList.remove('elegido'); });
        chip.classList.add('elegido');
        if (registros[idx]) registros[idx].conf = chip.getAttribute('data-conf');
        refrescarHoja();
      });
    });

    opciones.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        opciones.forEach(function (b, j) {
          b.disabled = true;
          if (j === correcta) b.classList.add('correcta');
        });
        if (i !== correcta) btn.classList.add('incorrecta');
        if (i === correcta) { if (fbOk) fbOk.classList.add('mostrar'); }
        else { if (fbNo) fbNo.classList.add('mostrar'); }

        registros[idx] = {
          pick: btn.textContent.trim(),
          correcta: (i === correcta),
          conf: registros[idx] ? registros[idx].conf : null
        };
        conf.classList.add('activa');
        refrescarHoja();
      });
    });
  });

  // --- Preguntas abiertas: refrescan la hoja al escribir ---
  document.querySelectorAll('textarea.abierta').forEach(function (ta) {
    ta.addEventListener('input', refrescarHoja);
  });

  // --- Botón copiar ---
  var btn = document.querySelector('.hoja-respuestas .hr-copiar');
  if (btn) {
    var aviso = document.querySelector('.hoja-respuestas .hr-aviso');
    btn.addEventListener('click', function () {
      var salida = document.querySelector('.hoja-respuestas .hr-salida');
      if (!salida) return;
      function ok() { if (aviso) { aviso.textContent = '¡Copiado! Pégalo en el chat.'; setTimeout(function () { aviso.textContent = ''; }, 3000); } }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(salida.value).then(ok, function () { salida.select(); document.execCommand('copy'); ok(); });
      } else {
        salida.select(); document.execCommand('copy'); ok();
      }
    });
  }

  refrescarHoja();
});
