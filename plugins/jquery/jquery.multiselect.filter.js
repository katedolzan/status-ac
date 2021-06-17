/* jshint forin:true, noarg:true, noempty:true, eqeqeq:true, boss:true, undef:true, curly:true, browser:true, jquery:true */
/*
 * jQuery MultiSelect UI Widget Filtering Plugin 2.0.0
 * Copyright (c) 2012 Eric Hynds
 *
 * http://www.erichynds.com/jquery/jquery-ui-multiselect-widget/
 *
 * Depends:
 *   - jQuery UI MultiSelect widget
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 */
(function ($) {
  var rEscape = /[\-\[\]{}()*+?.,\\\^$|#\s]/g;

  //Courtesy of underscore.js
  function debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this, args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }

  $.widget('ech.multiselectfilter', {
    options: {
      label: 'Filter:',
      width: null, /* override default width set in css file (px). null will inherit */
      placeholder: 'Enter keywords',
      autoReset: false,
      debounceMS: 250
    },
    _create: function () {
      var opts = this.options;
      var elem = $(this.element);

      // get the multiselect instance
      //this.instance = elem.multiselect('instance');
      this.instance = $(this.element).data('multiselect') || elem.multiselect('instance');

      if (!this.instance) {
        return;
      }

      // store header; add filter class so the close/check all/uncheck all links can be positioned correctly
      this.header = this.instance.menu.find('.ui-multiselect-header').addClass('ui-multiselect-hasfilter');

      // wrapper elem
      this.input = $("<input/>").attr({
        placeholder: 'Pesquisar...',
        type: "search"
      }).css({
        width: (/\d/.test(opts.width) ? opts.width + 'px' : null)
      }).bind({
        keydown: function (e) {
          // prevent the enter key from submitting the form / closing the widget
          if (e.which === 13) {
            e.preventDefault();
          } else if (e.which === 27) {
            elem.multiselect('close');
            e.preventDefault();
          } else if (e.which === 9 && e.shiftKey) {
            elem.multiselect('close');
            e.preventDefault();
          } else if (e.altKey) {
            switch (e.which) {
              case 82:
                e.preventDefault();
                $(this).val('').trigger('input', '');
                break;
              case 65:
                elem.multiselect('checkAll');
                break;
              case 85:
                elem.multiselect('uncheckAll');
                break;
              case 76:
                elem.multiselect('instance').labels.first().trigger("mouseenter");
                break;
            }
          }
        },
        input: $.proxy(debounce(this._handler, opts.debounceMS), this),
        search: $.proxy(this._handler, this)
      });
      // automatically reset the widget on close?
      if (this.options.autoReset) {
        elem.bind('multiselectclose', $.proxy(this._reset, this));
      }
      // rebuild cache when multiselect is updated
      elem.bind('multiselectrefresh', $.proxy(function () {
        this.updateCache();
        this._handler();
      }, this));
      this.wrapper = $("<div/>").addClass("ui-multiselect-filter").text(opts.label).append(this.input).prependTo(this.header);

      // reference to the actual inputs
      this.inputs = this.instance.menu.find('input[type="checkbox"], input[type="radio"]');

      // cache input values for searching
      this.updateCache();

      // rewrite internal _toggleChecked fn so that when checkAll/uncheckAll is fired,
      // only the currently filtered elements are checked
      this.instance._toggleChecked = function (flag, group) {
        var $inputs = (group && group.length) ? group : this.labels.find('input');
        var _self = this;

        // do not include hidden elems if the menu isn't open.
        var selector = _self._isOpen ? ':disabled, :hidden' : ':disabled';

        $inputs = $inputs
                .not(selector)
                .each(this._toggleState('checked', flag));

        // update text
        this.update();

        // gather an array of the values that actually changed
        var values = {};
        $inputs.each(function () {
          values[this.value] = true;
        });

        // select option tags
        this.element.find('option').filter(function () {
          if (!this.disabled && values[this.value]) {
            _self._toggleState('selected', flag).call(this);
          }
        });

        // trigger the change event on the select
        if ($inputs.length) {
          this.element.trigger('change');
        }
      };
    },
    // thx for the logic here ben alman
    _handler: function (e) {
      var term = this.input[0].value.trim().toLowerCase()
                                           .removeAcentos(true)  // Remove os acentos mantando os espaços
                                           .replace(/\//g, '')   // Remove as '/'
                                           .replace(/  +/g, ' ') // Remove os espaços duplos, ou maiores
                                           ;
      // speed up lookups
      var rows = this.rows, inputs = this.inputs, cache = this.cache;
      var $groups = this.instance.menu.find(".ui-multiselect-optgroup-label");
      if (!term) {
        rows.show();
        $groups.show();
      } else {
        rows.hide();
        $groups.hide();
        this.updateCacheToSearch();
        cache = this.cache;
        var regex = new RegExp(term.replace(rEscape, "\\$&"), 'gi');
        this._trigger("filter", e, $.map(cache, function (v, i) {
          //removidos os acentos, visto que no termo de pesquisa está sendo removido também
          v = v.removeAcentos(true);
          if (v.search(regex) !== -1) {
            var row = rows.eq(i);
            row.show();
            // Exibimos o label do grupo a que pertence a linha
            row.parents('ul').children('[data-lb="{0}"]'.format(row.data('parentlb'))).show();
            return inputs.get(i);
          }

          return null;
        }));
        this.updateCache();
      }

      this.instance._setMenuHeight();
    },
    _reset: function () {
      this.input.val('').trigger('input', '');
    },
    updateCache: function () {
      // each list item
      this.rows = this.instance.labels.parent();

      // Criamos o cache baseado nas próprias linhas de conteúdo
      this.cache = this.rows.map(function(k, v) {
        var sValFiltro = v.getElementsByTagName('input')[0].title;

        if (v.hasAttribute('data-tofilter')) {
          /**
           *  Quando existe mais informações a serem usadas no filtro,
           *  porém não devem aparecer no dropdown
           */
          sValFiltro = '{0} {1}'.format(sValFiltro, v.getAttribute('data-tofilter'));
        }

        sValFiltro = sValFiltro.trim().toLowerCase() // Para facilitar a busca
                               .removeAcentos(true)  // Remove os acentos mantando os espaços
                               .replace(/\//g, '')   // Remove as '/'
                               .replace(/  +/g, ' ') // Remove os espaços duplos, ou maiores
       ;

        return sValFiltro;
      }).get();
    },
    updateCacheToSearch: function () {
      // each list item
      this.rows = this.instance.labels.parent();

      // Criamos o cache baseado nas próprias linhas de conteúdo
      this.cache = this.rows.map(function(k, v) {
        var sValFiltro = '{0}-{1}'.format($(v).data('parentlb'), v.getElementsByTagName('input')[0].title);

        if (v.hasAttribute('data-tofilter')) {
          /**
           *  Quando existe mais informações a serem usadas no filtro,
           *  porém não devem aparecer no dropdown
           */
          sValFiltro = '{0}-{1}'.format(sValFiltro, v.getAttribute('data-tofilter'));
        }

        sValFiltro = sValFiltro.trim().toLowerCase() // Para facilitar a busca
                               .removeAcentos(true)  // Remove os acentos mantando os espaços
                               .replace(/\//g, '')   // Remove as '/'
                               .replace(/  +/g, ' ') // Remove os espaços duplos, ou maiores
       ;

        return sValFiltro;
      }).get();
    },
    widget: function () {
      return this.wrapper;
    },
    destroy: function () {
      $.Widget.prototype.destroy.call(this);
      this.input.val('').trigger("keyup");
      this.wrapper.remove();
    }
  });

})(jQuery);
