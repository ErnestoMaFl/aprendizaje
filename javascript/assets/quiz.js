/* quiz.js — widget de quiz + hoja de respuestas copiable, reutilizable.

   Tres formatos de pregunta (mezclarlos es lo que hace que el repaso funcione):

   1) OPCIÓN MÚLTIPLE
   <div class="quiz" data-correcta="1" data-num="2">
     <p class="quiz-pregunta"><span class="quiz-num">Pregunta 2</span><br>¿...?</p>
     <div class="opciones">
       <button class="opcion">Opción A</button>
       <button class="opcion">Opción B</button>   <- índice 1 = correcta
       <button class="opcion">Opción C</button>
     </div>
     <div class="feedback ok" data-para="ok">¡Correcto! ...</div>
     <div class="feedback no" data-para="no">No exactamente. ...</div>
   </div>

   2) RESPUESTA CORTA (autocorregida). data-acepta = respuestas válidas separadas
      por "|". Se comparan sin distinguir mayúsculas ni espacios sobrantes.
   <div class="quiz quiz-corta" data-num="3" data-acepta="const|const y let">
     <p class="quiz-pregunta"><span class="quiz-num">Pregunta 3</span><br>¿...?</p>
     <div class="corta-fila">
       <input class="corta-input" type="text" placeholder="Tu respuesta…">
       <button class="corta-comprobar" type="button">Comprobar</button>
     </div>
     <div class="feedback ok" data-para="ok">…</div>
     <div class="feedback no" data-para="no">…</div>
   </div>

   3) PREGUNTA ABIERTA (escribir de memoria, misión de lectura, «¿por qué?»).
      La corrige el tutor en el chat a partir de la hoja de respuestas.
   <label class="pregunta-abierta">
     <span class="pa-titulo">Misión de lectura: traduce …</span>
     <textarea class="abierta" data-label="Misión de lectura" rows="3"></textarea>
   </label>

   Tras responder 1) o 2) el widget pide el nivel de seguridad
   (seguro / dudoso / adivinando): sirve para detectar la falsa sensación de dominio.

   HOJA DE RESPUESTAS (al final de la lección — el alumno la copia y la pega en el chat):
   <div class="hoja-respuestas">
     <p class="hr-intro">…</p>
     <textarea class="hr-salida" readonly rows="10"></textarea>
     <button class="hr-copiar" type="button">Copiar para el chat</button>
     <span class="hr-aviso"></span>
   </div>
   La hoja se rellena sola con cada respuesta (autocorregida u abierta). */

document.addEventListener('DOMContentLoaded', function () {
  var registros = new Map();   // elemento .quiz -> { pick, correcta, conf }

  function normalizar(s) {
    return (s || '').trim().toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,;:!?]+$/, '');
  }

  function refrescarHoja() {
    var salida = document.querySelector('.hoja-respuestas .hr-salida');
    if (!salida) return;

    var quizzes = Array.prototype.slice.call(document.querySelectorAll('.quiz'));
    var abiertas = Array.prototype.slice.call(document.querySelectorAll('textarea.abierta'));
    var lineas = [];
    lineas.push('📋 ' + (document.title || 'Lección'));
    lineas.push('');

    if (quizzes.length) {
      lineas.push('— Quizzes (autocorregidos) —');
      quizzes.forEach(function (quiz, i) {
        var num = quiz.getAttribute('data-num') || (i + 1);
        var r = registros.get(quiz);
        if (!r) {
          lineas.push('Q' + num + ': (sin responder)');
        } else {
          var marca = r.correcta ? '✔ correcta' : '✘ incorrecta';
          var conf = r.conf ? ' · seguridad: ' + r.conf : '';
          lineas.push('Q' + num + ': ' + marca + ' — respondí «' + r.pick + '»' + conf);
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

  /* --- Selector de seguridad, común a los dos tipos autocorregidos --- */
  function montarConfianza(quiz) {
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
        var r = registros.get(quiz);
        if (r) r.conf = chip.getAttribute('data-conf');
        refrescarHoja();
      });
    });
    return conf;
  }

  function mostrarFeedback(quiz, acerto) {
    var fb = quiz.querySelector('.feedback[data-para="' + (acerto ? 'ok' : 'no') + '"]');
    if (fb) fb.classList.add('mostrar');
  }

  /* --- 1) Opción múltiple --- */
  document.querySelectorAll('.quiz:not(.quiz-corta)').forEach(function (quiz) {
    var correcta = parseInt(quiz.getAttribute('data-correcta'), 10);
    var opciones = Array.prototype.slice.call(quiz.querySelectorAll('.opcion'));
    if (!opciones.length) return;
    var conf = montarConfianza(quiz);

    opciones.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        opciones.forEach(function (b, j) {
          b.disabled = true;
          if (j === correcta) b.classList.add('correcta');
        });
        if (i !== correcta) btn.classList.add('incorrecta');
        mostrarFeedback(quiz, i === correcta);

        var previo = registros.get(quiz);
        registros.set(quiz, {
          pick: btn.textContent.trim(),
          correcta: (i === correcta),
          conf: previo ? previo.conf : null
        });
        conf.classList.add('activa');
        refrescarHoja();
      });
    });
  });

  /* --- 2) Respuesta corta autocorregida --- */
  document.querySelectorAll('.quiz-corta').forEach(function (quiz) {
    var input = quiz.querySelector('.corta-input');
    var boton = quiz.querySelector('.corta-comprobar');
    if (!input || !boton) return;
    var acepta = (quiz.getAttribute('data-acepta') || '').split('|')
      .map(normalizar).filter(Boolean);
    var conf = montarConfianza(quiz);

    function comprobar() {
      var valor = input.value.trim();
      if (!valor) { input.focus(); return; }
      var acerto = acepta.some(function (a) { return normalizar(valor) === a; });

      input.disabled = true;
      boton.disabled = true;
      boton.textContent = 'Respondida';
      input.style.borderColor = acerto ? 'var(--verde)' : 'var(--rojo)';
      mostrarFeedback(quiz, acerto);

      var previo = registros.get(quiz);
      registros.set(quiz, {
        pick: valor,
        correcta: acerto,
        conf: previo ? previo.conf : null
      });
      conf.classList.add('activa');
      refrescarHoja();
    }

    boton.addEventListener('click', comprobar);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); comprobar(); }
    });
  });

  /* --- 3) Preguntas abiertas: refrescan la hoja al escribir --- */
  document.querySelectorAll('textarea.abierta').forEach(function (ta) {
    ta.addEventListener('input', refrescarHoja);
  });

  /* --- Botón copiar --- */
  var btn = document.querySelector('.hoja-respuestas .hr-copiar');
  if (btn) {
    var aviso = document.querySelector('.hoja-respuestas .hr-aviso');
    btn.addEventListener('click', function () {
      var salida = document.querySelector('.hoja-respuestas .hr-salida');
      if (!salida) return;
      function ok() {
        if (aviso) {
          aviso.textContent = '¡Copiado! Pégalo en el chat.';
          setTimeout(function () { aviso.textContent = ''; }, 3000);
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(salida.value).then(ok, function () { salida.select(); document.execCommand('copy'); ok(); });
      } else {
        salida.select(); document.execCommand('copy'); ok();
      }
    });
  }

  refrescarHoja();
});
