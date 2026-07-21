/* repl.js — consola de JavaScript en vivo, empotrada en la lección.

   Por qué existe: aprender a programar necesita el bucle de retroalimentación más
   corto posible (escribo → ejecuto → veo el resultado). Este componente lo mete
   dentro de la propia lección: sin abrir editor, sin cambiar de pestaña.

   USO:
   <div class="repl" data-titulo="Pruébalo tú">
     <textarea class="repl-codigo" rows="6">console.log("hola");</textarea>
   </div>

   El script construye solo la cabecera, los botones y el panel de salida.
   Todo lo que el código escriba con console.log / console.error / console.warn
   aparece en el panel negro. Los errores se muestran en rojo, sin romper la página.

   Atributos opcionales en .repl:
     data-titulo="…"   texto de la cabecera (por defecto: «Consola en vivo»)
     data-pista="…"    aviso pequeño junto a los botones
*/

document.addEventListener('DOMContentLoaded', function () {

  var MAX_LINEAS = 300;   // corta salidas desbocadas (p. ej. un bucle infinito imprimiendo)

  /* --- Formateo de valores: que se vea el TIPO, no solo el contenido --- */
  function escapar(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatear(v, profundidad) {
    profundidad = profundidad || 0;
    if (v === null) return '<span class="r-num">null</span>';
    if (v === undefined) return '<span class="r-num">undefined</span>';

    var t = typeof v;
    if (t === 'string') {
      // En la consola, un texto se muestra entrecomillado para distinguirlo de un número.
      return profundidad === 0
        ? escapar(v)
        : '<span class="r-str">"' + escapar(v) + '"</span>';
    }
    if (t === 'number' || t === 'boolean' || t === 'bigint')
      return '<span class="r-num">' + escapar(String(v)) + '</span>';
    if (t === 'function')
      return '<span class="r-flecha">ƒ ' + escapar(v.name || '(anónima)') + '()</span>';
    if (t === 'symbol') return escapar(String(v));

    if (Array.isArray(v)) {
      if (profundidad > 2) return '[…]';
      return '[ ' + v.map(function (x) { return formatear(x, profundidad + 1); }).join(', ') + ' ]';
    }
    if (v instanceof Error) return escapar(v.name + ': ' + v.message);

    if (t === 'object') {
      if (profundidad > 2) return '{…}';
      var claves = Object.keys(v);
      if (!claves.length) return '{}';
      return '{ ' + claves.map(function (k) {
        return escapar(k) + ': ' + formatear(v[k], profundidad + 1);
      }).join(', ') + ' }';
    }
    return escapar(String(v));
  }

  /* --- Montaje de cada consola --- */
  document.querySelectorAll('.repl').forEach(function (repl) {
    var area = repl.querySelector('.repl-codigo');
    if (!area) return;

    var codigoOriginal = area.value;

    // Cabecera
    var cab = document.createElement('div');
    cab.className = 'repl-cabecera';
    cab.innerHTML = '<span class="repl-punto"></span>' +
      escapar(repl.getAttribute('data-titulo') || 'Consola en vivo');
    repl.insertBefore(cab, area);

    // Barra de botones
    var barra = document.createElement('div');
    barra.className = 'repl-barra';
    var pista = repl.getAttribute('data-pista') ||
      'Todo lo que pases a console.log() aparece abajo.';
    barra.innerHTML =
      '<button type="button" class="repl-ejecutar">▶ Ejecutar</button>' +
      '<button type="button" class="repl-reiniciar">↺ Restaurar</button>' +
      '<span class="repl-pista">' + escapar(pista) + '</span>';
    repl.appendChild(barra);

    // Panel de salida
    var salida = document.createElement('pre');
    salida.className = 'repl-salida';
    repl.appendChild(salida);

    function ejecutar() {
      var lineas = [];
      var cortado = false;

      function push(html, clase) {
        if (lineas.length >= MAX_LINEAS) { cortado = true; return; }
        lineas.push(clase ? '<span class="' + clase + '">' + html + '</span>' : html);
      }

      // console falso: recoge la salida en vez de mandarla al navegador
      var consola = {
        log: function () {
          push(Array.prototype.map.call(arguments, function (a) { return formatear(a); }).join(' '));
        },
        info: function () { consola.log.apply(null, arguments); },
        warn: function () {
          push('⚠ ' + Array.prototype.map.call(arguments, function (a) { return formatear(a); }).join(' '));
        },
        error: function () {
          push('✖ ' + Array.prototype.map.call(arguments, function (a) { return formatear(a); }).join(' '), 'r-error');
        },
        table: function (v) { consola.log(v); },
        clear: function () { lineas.length = 0; },
      };

      try {
        // El código del alumno se ejecuta en su propia función, con SU console.
        // 'use strict' para que los errores típicos (asignar a const, variable no
        // declarada) salten de verdad en vez de pasar en silencio.
        var fn = new Function('console', '"use strict";\n' + area.value);
        fn(consola);
      } catch (e) {
        push('✖ ' + escapar((e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e))), 'r-error');
      }

      if (cortado) push('… (salida cortada en ' + MAX_LINEAS + ' líneas)', 'r-flecha');

      salida.innerHTML = lineas.length
        ? lineas.join('\n')
        : '<span class="r-vacio">(sin salida — usa console.log(…) para ver algo aquí)</span>';
      salida.classList.add('mostrar');
    }

    barra.querySelector('.repl-ejecutar').addEventListener('click', ejecutar);
    barra.querySelector('.repl-reiniciar').addEventListener('click', function () {
      area.value = codigoOriginal;
      salida.classList.remove('mostrar');
      salida.innerHTML = '';
    });

    // Ctrl/Cmd + Enter ejecuta, como en cualquier editor
    area.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ejecutar(); }
      // Tab inserta dos espacios en vez de saltar de campo
      if (e.key === 'Tab') {
        e.preventDefault();
        var i = area.selectionStart;
        area.value = area.value.slice(0, i) + '  ' + area.value.slice(area.selectionEnd);
        area.selectionStart = area.selectionEnd = i + 2;
      }
    });
  });
});
