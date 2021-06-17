/* jshint forin:true, noarg:true, noempty:true, eqeqeq:true, boss:true, undef:true, curly:true, browser:true, jquery:true */
/*
 * jQuery MultiSelect UI Widget 2.0.1
 * Copyright (c) 2012 Eric Hynds
 *
 * http://www.erichynds.com/jquery/jquery-ui-multiselect-widget/
 *
 * Depends:
 *   - jQuery 1.4.2+
 *   - jQuery UI 1.11 widget factory
 *
 * Optional:
 *   - jQuery UI effects
 *   - jQuery UI position utility
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 */
(function ($, undefined) {
  // Counter used to prevent collisions
  var multiselectID = 0;
  var $doc = $(document);

  $.widget("ech.multiselect", {
    // default options
    options: {
      header: true,
      height: 175,
      minWidth: 100,
      autoWidth: true,
      classes: '',
      classSize: '',
      btnAll: true,
      checkAllText: 'Marcar Todos',
      uncheckAllText: 'Desmarcar Todos',
      noneSelectedText: '--- Selecione ---',
      showCheckAll: true,
      showUncheckAll: true,
      selectedText: '# selecionados',
      selectedList: 0,
      closeIcon: 'ui-icon-circle-close',
      show: null,
      hide: null,
      showDisabled: true,
      autoOpen: false,
      multiple: true,
      btnAdd: null,
      position: {},
      appendTo: null,
      menuWidth: null,
      selectedListSeparator: ', ',
      disableInputsOnToggle: true,
      groupColumns: false
    },
    _getAppendEl: function () {
      var element = this.options.appendTo;
      if (element) {
        element = element.jquery || element.nodeType ? $(element) : this.document.find(element).eq(0);
      }
      if (!element || !element[0]) {
        element = this.element.closest(".ui-front, dialog");
      }
      if (!element.length) {
        element = this.document[0].body;
      }
      return element;
    },
    _create: function () {
      var el = this.element.hide(),
              o = this.options;

      this.speed = $.fx.speeds._default; // default speed for effects
      this._isOpen = false; // assume no
      this.inputIdCounter = 0;

      // create a unique namespace for events that the widget
      // factory cannot unbind automatically. Use eventNamespace if on
      // jQuery UI 1.9+, and otherwise fallback to a custom string.
      this._namespaceID = this.eventNamespace || ('multiselect' + multiselectID);
      // bump unique ID after assigning it to the widget instance
      this.multiselectID = multiselectID++;
      var button = (this.button = $('<button type="button"><span class="ui-icon ui-icon-triangle-1-s"></span></button>'))
              .addClass('ui-multiselect ui-widget ui-state-default ui-corner-all')
              .addClass(o.classes)
              .addClass(o.classSize)
              .attr({'title': el.attr('title') || el.attr('original-title'), 'aria-haspopup': true, 'tabIndex': el.attr('tabIndex')})
              .prop('aria-haspopup', true)
              .insertAfter(el);

      this.buttonlabel = $('<span />')
              .html(o.noneSelectedText)
              .appendTo(button);

      this.menu = $('<div />')
              .addClass('ui-multiselect-menu ui-widget ui-widget-content ui-corner-all')
              .addClass(o.classes)
              //.appendTo(this._getAppendEl());
              .width(button.outerWidth())
              .insertAfter(button);

      this.header = $('<div />')
              .addClass('ui-widget-header ui-corner-all ui-multiselect-header ui-helper-clearfix')
              .appendTo(this.menu);

      this.headerLinkContainer = $('<ul />')
              .addClass('ui-helper-reset')
              .html(function () {
                if ((o.header === true) && (o.btnAll === true) && (o.multiple)) {
                  var header_lis = '';
                  if (o.showCheckAll) {
                    header_lis = '<li><a class="ui-multiselect-all" href="#"><span>' + o.checkAllText + '</span></a></li>';
                  }
                  if (o.showUncheckAll) {
                    header_lis += '<li><a class="ui-multiselect-none" href="#"><span>' + o.uncheckAllText + '</span></a></li>';
                  }
                  return header_lis;
                } else if (typeof o.header === "string" && o.header !== "") {
                  return '<li>' + o.header + '</li>';
                } else {
                  return '';
                }
              })
              .append('<li class="ui-multiselect-close"><a href="#" class="ui-multiselect-close"><span class="ui-icon ' + o.closeIcon + '"></span></a></li>')
              .append('<li class="ui-multiselect-add"><a href="#" title="Adicionar" class="ui-multiselect-add"><span class="ui-icon ui-icon-circle-plus"></span></a></li>')
              .appendTo(this.header);

      var checkboxContainer = (this.checkboxContainer = $('<ul />'))
              .addClass('ui-multiselect-checkboxes ui-helper-reset')
              .appendTo(this.menu);

      // perform event bindings
      this._bindEvents();

      // build menu
      this.refresh(true);

      // some addl. logic for single selects
      if (!o.multiple) {
        this.menu.addClass('ui-multiselect-single');
      }
      el.hide();
    },
    _init: function () {
      if (this.options.header === false) {
        this.header.hide();
      }
      if (!this.options.btnAdd) {
        this.headerLinkContainer.find('.ui-multiselect-add').hide();
      }
      if (!this.options.multiple) {
        this.headerLinkContainer.find('.ui-multiselect-all, .ui-multiselect-none').hide();
      } else {
        this.headerLinkContainer.show();
      }
      if (this.options.autoOpen) {
        this.open();
      }
      if (this.element.is(':disabled')) {
        this.disable();
      }
    },
    _makeOption: function (option) {
      var title = option.title ? option.title : null;
      var value = option.value;
      var id = this.element.attr('id') || this.multiselectID; // unique ID for the label & option tags
      var inputID = 'ui-multiselect-' + this.multiselectID + '-' + (option.id || id + '-option-' + this.inputIdCounter++);
      var isDisabled = option.disabled;
      var isSelected = option.selected;
      var labelClasses = [];
      var liClasses = [];
      var o = this.options;

      if (isDisabled) {
        liClasses.push('ui-multiselect-disabled');
        labelClasses.push('ui-state-disabled');
      }
      if (option.className) {
        liClasses.push(option.className);
      }
      if (isSelected && !o.multiple) {
        labelClasses.push('ui-state-active');
      }

      var $item = $("<li/>").addClass(liClasses.join(' '));
      var $label = $("<label/>").attr({
        "for": inputID,
        "title": title
      }).addClass(labelClasses.join(' ')).appendTo($item);
      var $input = $("<input/>").attr({
        "name": "multiselect_" + id,
        "type": o.multiple ? "checkbox" : "radio",
        "value": value,
        "title": title,
        "id": inputID,
        "checked": isSelected ? "checked" : null,
        "aria-selected": isSelected ? "true" : null,
        "disabled": isDisabled ? "disabled" : null,
        "aria-disabled": isDisabled ? "true" : null
      }).data($(option).data()).appendTo($label);

      var $span = $("<span/>").text($(option).text());
      if ($input.data("image-src")) {
        $span.prepend($("<img/>").attr({"src": $input.data("image-src")}));
      }
      $span.appendTo($label);

      return $item;
    },
    _buildOptionList: function (element, $appendTo) {
      var self = this;
      element.children().each(function () {
        var $this = $(this);
        if (this.disabled && !o.showDisabled) {
          return true;//continue loop
        }
        if (this.tagName === 'OPTGROUP') {
          var $optionGroup = $("<ul/>").addClass('ui-multiselect-optgroup ' + this.className).appendTo($appendTo);
          if (self.options.groupColumns) {
            $optionGroup.addClass("ui-multiselect-columns");
          }
          $("<a/>").text(this.getAttribute('label')).appendTo($optionGroup);
          self._buildOptionList($this, $optionGroup);
        } else {
          var $listItem = self._makeOption(this).appendTo($appendTo);
        }
      });

    },
    refresh: function (init) {
      var self = this;
      var el = this.element;
      var o = this.options;
      var menu = this.menu;
      var checkboxContainer = this.checkboxContainer;
      var $dropdown = $("<ul/>").addClass('ui-multiselect-checkboxes ui-helper-reset');
      var optgroups = [];
      var html = [];
      var id = el.attr('id') || multiselectID++;
      var iScrollTop = $(this.checkboxContainer).scrollTop();
      this.inputIdCounter = 0;


      // build items
      el.find('option').each(function (i) {
        var $this = $(this);
        var parent = this.parentNode;
        var title = this.innerHTML;
        var description = this.title;
        var value = this.value;
        var inputID = this.id || 'ui-multiselect-' + id + '-option-' + i;
        var isDisabled = this.disabled;
        var isSelected = this.selected;
        var labelClasses = ['ui-corner-all'];
        var optLabel;
        var sToFilter = $this.data('tofilter'); // Mais conteúdo para usarmos nos filtros

        if (isDisabled && !o.showDisabled) {
          return true;//continue loop
        }

        // is this an optgroup?
        if (parent.tagName.toLowerCase() === 'optgroup') {
          optLabel = parent.getAttribute('label');

          // has this optgroup been added already?
          if ($.inArray(optLabel, optgroups) === -1) {
            html.push('<li class="ui-multiselect-optgroup-label" data-lb="{0}"><a href="#">{0}</a></li>'.format(optLabel));
            optgroups.push(optLabel);
          }
        }

        if (isDisabled) {
          labelClasses.push('ui-state-disabled');
        }

        // browsers automatically select the first option
        // by default with single selects
        if (isSelected && !o.multiple) {
          labelClasses.push('ui-state-active');
        }

        if (sToFilter) {
          /**
           * Quando precisamos de mais conteúdo para usarmos nos filtros,
           * mas que não devem apararecer no dropdown
           */
          sToFilter = 'data-tofilter="{0}"'.format(sToFilter);
        } else {
          sToFilter = '';
        }

        html.push('<li class="{0}" {1} {2}>'.format(isDisabled ? 'ui-multiselect-disabled' : ''
          , sToFilter
          , optLabel ? 'data-parentlb="{0}"'.format(optLabel) : ''
        ));

        //se tiver atributo bgcolor e color no option - Jonatan
        var color = $this.attr('color');
        var bgcolor = $this.attr('bgcolor');

        if (typeof (color) != 'undefined') {
          color = 'color:' + color;
        }

        if (typeof (bgcolor) != 'undefined') {
          bgcolor = 'background-color:' + bgcolor;
        }

        // create the label
        html.push('<label for="' + inputID + '" title="' + description + '" class="' + labelClasses.join(' ') + '">');
        html.push('<input style="' + (color != '' ? 'float:left;' : '') + (isDisabled ? 'visibility:hidden;' : '') + '" id="' + inputID + '" name="multiselect_' + id + '" type="' + (o.multiple ? "checkbox" : "radio") + '" value="' + value + '" title="' + title + '"');

        // pre-selected?
        if (isSelected) {
          html.push(' checked="checked"');
          html.push(' aria-selected="true"');
        }

        // disabled?
        if (isDisabled) {
          html.push(' disabled="disabled"');
          html.push(' aria-disabled="true"');
        }

        var sTextoAdicional = '';
        if(!!$this.data('text-adicional')) {
            title = title.replace($this.data('text-adicional'),'');
            sTextoAdicional = '<span style="font-weight:bold">- {0}</span>'.format($this.data('text-adicional'));
        }

        //se tiver atributo bgcolor e color no option - Jonatan
        if ((color != '') || (bgcolor != '')) {
          title = '<span class="opt-marcador" style="' + bgcolor + '; ' + color + ';">' + title + sTextoAdicional + '</span>';
        }

        // add the title and close everything off
        html.push(' /><span>' + title + '</span><div style="clear:both"></div></label></li>');
      });

      // insert into the DOM
      this.checkboxContainer.html(html.join(''));

      // update header link container visibility if needed
      if (this.options.header) {
        if (!this.options.multiple) {
          this.headerLinkContainer.hide();
        } else {
          this.headerLinkContainer.show();
        }
      }

//      this._buildOptionList(el, $dropdown);

      this.menu.find(".ui-multiselect-checkboxes").remove();
      this.menu.append(this.checkboxContainer);

      // cache some moar useful elements
      this.labels = menu.find('label');
      this.inputs = this.labels.children('input');

      this._setButtonWidth();

      this._setMenuWidth();

      // remember default value
      this.button[0].defaultValue = this.update();

      var $container = this.menu.find('ul').last();

      // set scroll position
      $container.scrollTop(iScrollTop);

      // broadcast refresh event; useful for widgets
      if (!init) {
        this._trigger('refresh');
      }
    },
    // updates the button text. call refresh() to rebuild
    update: function (isDefault) {
      var o = this.options,
              $inputs = this.labels.find('input'),
              //$checked = $inputs.filter('[checked]'),
              $checked = $inputs.filter(':checked'), //trocamos para funcionar com apenas um item, pois estava com bug
              numChecked = $checked.length,
              value;

      if (numChecked === 0) {
        value = o.noneSelectedText;
      } else {
        if ($.isFunction(o.selectedText)) {
          value = o.selectedText.call(this, numChecked, $inputs.length, $checked.get());
        } else if (/\d/.test(o.selectedList) && o.selectedList > 0 && numChecked <= o.selectedList) {
          value = $checked.map(function () {
            return $(this).next().html();
          }).get().join(o.selectedListSeparator);
        } else {
          value = o.selectedText.replace('#', numChecked).replace('#', $inputs.length);
        }
      }

      this.buttonlabel.html(value);
      return value;

    },
    // this exists as a separate method so that the developer
    // can easily override it.
    _setButtonValue: function (value) {
      this.button.prop('title', value);
      this.buttonlabel.text(value);
    },
    _bindButtonEvents: function () {
      var self = this;
      var button = this.button;
      function clickHandler() {
        self[ self._isOpen ? 'close' : 'open' ]();
        return false;
      }

      // webkit doesn't like it when you click on the span :(
      button
              .find('span')
              .bind('click.multiselect', clickHandler);

      // button events
      button.bind({
        click: clickHandler,
        keypress: function (e) {
          switch (e.which) {
            case 27: // esc
            case 38: // up
            case 37: // left
              self.close();
              break;
            case 39: // right
            case 40: // down
              self.open();
              break;
          }
        },
        /*
         mouseenter: function() {
         if(!button.hasClass('ui-state-disabled')) {
         $(this).addClass('ui-state-hover');
         }
         },
         mouseleave: function() {
         $(this).removeClass('ui-state-hover');
         },
         */
        focus: function () {
          if (!button.hasClass('ui-state-disabled')) {
            $(this).addClass('ui-state-focus');
          }
        },
        blur: function () {
          $(this).removeClass('ui-state-focus');
        }
      });
    },
    _bindMenuEvents: function () {
      var self = this;
      // optgroup label toggle support
      this.menu.delegate('li.ui-multiselect-optgroup-label a', 'click.multiselect', function (e) {
        e.preventDefault();

        var $this = $(this);
        var $inputs = $this.parent().nextUntil('li.ui-multiselect-optgroup-label').find('input:visible:not(:disabled)');
        var nodes = $inputs.get();
        var label = $this.parent().text();

        // trigger event and bail if the return is false
        if (self._trigger('beforeoptgrouptoggle', e, {inputs: nodes, label: label}) === false) {
          return;
        }

        // toggle inputs
        self._toggleChecked(
                $inputs.filter(':checked').length !== $inputs.length,
                $inputs
                );

        self._trigger('optgrouptoggle', e, {
          inputs: nodes,
          label: label,
          checked: nodes.length ? nodes[0].checked : null
        });
      })
              .delegate('label', 'mouseenter.multiselect', function () {
                if (!$(this).hasClass('ui-state-disabled')) {
                  self.labels.removeClass('ui-state-hover');
                  $(this).addClass('ui-state-hover').find('input').focus();
                }
              })
              .delegate('label', 'keydown.multiselect', function (e) {
                if (e.which === 82) {
                  return; //"r" key, often used for reload.
                }
                if (e.which > 111 && e.which < 124) {
                  return; //Keyboard function keys.
                }
                e.preventDefault();
                switch (e.which) {
                  case 9: // tab
                    if (e.shiftKey) {
                      self.menu.find(".ui-state-hover").removeClass("ui-state-hover");
                      self.header.find("li").last().find("a").focus();
                    } else {
                      self.close();
                    }
                    break;
                  case 27: // esc
                    self.close();
                    break;
                  case 38: // up
                  case 40: // down
                  case 37: // left
                  case 39: // right
                    self._traverse(e.which, this);
                    break;
                  case 13: // enter
                  case 32:
                    $(this).find('input')[0].click();
                    break;
                  case 65:
                    if (e.altKey) {
                      self.checkAll();
                    }
                    break;
                  case 85:
                    if (e.altKey) {
                      self.uncheckAll();
                    }
                    break;
                }
              })
              .delegate('input[type="checkbox"], input[type="radio"]', 'click.multiselect', function (e) {
                var $this = $(this);
                var val = this.value;
                var optionText = $this.parent().find("span").text();
                var checked = this.checked;
                var tags = self.element.find('option');

                // bail if this input is disabled or the event is cancelled
                if (this.disabled || self._trigger('click', e, {value: val, text: optionText, checked: checked}) === false) {
                  e.preventDefault();
                  return;
                }

                // make sure the input has focus. otherwise, the esc key
                // won't close the menu after clicking an item.
                $this.focus();

                // toggle aria state
                $this.prop('aria-selected', checked);

                // change state on the original option tags
                tags.each(function () {
                  if (this.value === val) {
                    this.selected = checked;
                  } else if (!self.options.multiple) {
                    this.selected = false;
                  }
                });

                // some additional single select-specific logic
                if (!self.options.multiple) {
                  self.labels.removeClass('ui-state-active');
                  $this.closest('label').toggleClass('ui-state-active', checked);

                  // close menu
                  self.close();
                }

                // fire change on the select box
                self.element.trigger("change");

                // setTimeout is to fix multiselect issue #14 and #47. caused by jQuery issue #3827
                // http://bugs.jquery.com/ticket/3827
                setTimeout($.proxy(self.update, self), 10);
              });
    },
    _bindHeaderEvents: function () {
      var self = this;
      // header links
      this.header.delegate('a', 'click.multiselect', function (e) {
        var $this = $(this);
        if ($this.hasClass('ui-multiselect-close')) {
          self.close();
        } else if ($this.hasClass("ui-multiselect-all")) {
          self.checkAll();
        } else if ($this.hasClass("ui-multiselect-none")) {
          self.uncheckAll();
        }
        e.preventDefault();
      }).delegate('a', 'keydown.multiselect', function (e) {
        switch (e.which) {
          case 27:
            self.close();
            break;
          case 9:
            var $target = $(e.target);
            if ((e.shiftKey && !$target.parent().prev().length && !self.header.find(".ui-multiselect-filter").length) || (!$target.parent().next().length && !self.labels.length && !e.shiftKey)) {
              self.close();
              e.preventDefault();
            }
            break;
        }
      });
    },
    // binds events
    _bindEvents: function () {
      var self = this;

      this._bindButtonEvents();
      this._bindMenuEvents();
      this._bindHeaderEvents();

      // close each widget when clicking on any other element/anywhere else on the page
      $doc.bind('mousedown.' + self._namespaceID, function (event) {
        var target = event.target;

        if (self._isOpen &&
                target !== self.button[0] &&
                target !== self.menu[0] &&
                !$.contains(self.menu[0], target) &&
                !$.contains(self.button[0], target)
                ) {
          self.close();
        }
      });

      // deal with form resets.  the problem here is that buttons aren't
      // restored to their defaultValue prop on form reset, and the reset
      // handler fires before the form is actually reset.  delaying it a bit
      // gives the form inputs time to clear.
      $(this.element[0].form).bind('reset.' + this._namespaceID, function () {
        setTimeout($.proxy(self.refresh, self), 10);
      });
    },
    _getMinWidth: function () {
      var minVal = this.options.minWidth;
      var width = 0;
      switch (typeof minVal) {
        case 'number':
          width = minVal;
          break;
        case 'string':
          var lastChar = minVal[ minVal.length - 1 ];
          width = minVal.match(/\d+/);
          if (lastChar === '%') {
            width = this.element.parent().outerWidth() * (width / 100);
          } else {
            width = parseInt(minVal, 10);
          }
          break;
      }
      return width;
    },
    // set button width
    _setButtonWidth: function () {
      var width = this.element.outerWidth();
      var minVal = this._getMinWidth();

      if (width < minVal) {
        width = minVal;
      }
      // set widths
      this.button.outerWidth(width);
    },
    // set menu width
    _setMenuWidth: function () {
      var m = this.menu;
      var width = (this.button.outerWidth() <= 0) ? this._getMinWidth() : this.button.outerWidth();
      m.outerWidth(this.options.menuWidth || width);
    },
    _setMenuHeight: function () {
      var headerHeight = this.menu.children(".ui-multiselect-header:visible").outerHeight(true);
      var ulHeight = this.options.height;
      /*
       this.menu.find(".ui-multiselect-checkboxes li, .ui-multiselect-checkboxes a").each(function(idx, li) {
       ulHeight += $(li).outerHeight(true) + 5;
       });
       if(ulHeight > this.options.height) {
       this.menu.children(".ui-multiselect-checkboxes").css("overflow", "auto");
       ulHeight = this.options.height;
       } else {
       this.menu.children(".ui-multiselect-checkboxes").css("overflow", "hidden");
       }
       */
      this.menu.children(".ui-multiselect-checkboxes").height(ulHeight);
      this.menu.height(ulHeight + headerHeight);
    },
    _resizeMenu: function () {
      this._setMenuWidth();
      this._setMenuHeight();
    },
    // move up or down within the menu
    _traverse: function (which, start) {
      var $start = $(start);
      var moveToLast = which === 38 || which === 37;

      // select the first li that isn't an optgroup label / disabled
      var $next = $start.parent()[moveToLast ? 'prevAll' : 'nextAll']('li:not(.ui-multiselect-disabled, .ui-multiselect-optgroup):visible').first();
      // we might have to jump to the next/previous option group
      if (!$next.length) {
        $next = $start.parents(".ui-multiselect-optgroup")[moveToLast ? "prev" : "next" ]();
      }

      // if at the first/last element
      if (!$next.length) {
        var $container = this.menu.find('ul').last();

        // move to the first/last
        this.menu.find('label:visible')[ moveToLast ? 'last' : 'first' ]().trigger('mouseover');

        // set scroll position
        $container.scrollTop(moveToLast ? $container.height() : 0);

      } else {
        $next.find('label:visible')[ moveToLast ? "last" : "first" ]().trigger('mouseover');
      }
    },
    // This is an internal function to toggle the checked property and
    // other related attributes of a checkbox.
    //
    // The context of this function should be a checkbox; do not proxy it.
    _toggleState: function (prop, flag) {
      return function () {
        if (!this.disabled) {
          this[ prop ] = flag;
        }

        if (flag) {
          this.setAttribute('aria-selected', true);
        } else {
          this.removeAttribute('aria-selected');
        }
      };
    },
    _toggleChecked: function (flag, group) {
      var $inputs = (group && group.length) ? group : this.labels.find('input');
      var self = this;

      // toggle state on inputs
      $inputs.each(this._toggleState('checked', flag));

      // give the first input focus
      $inputs.eq(0).focus();

      // update button text
      this.update();

      // gather an array of the values that actually changed
      var values = {};
      $inputs.each(function () {
        values[this.value] = true;
      });

      // toggle state on original option tags
      this.element
              .find('option')
              .each(function () {
                if (!this.disabled && values[this.value]) {
                  self._toggleState('selected', flag).call(this);
                }
              });

      // trigger the change event on the select
      if ($inputs.length) {
        this.element.trigger("change");
      }
    },
    _toggleDisabled: function (flag) {
      this.button.prop({'disabled': flag, 'aria-disabled': flag})[ flag ? 'addClass' : 'removeClass' ]('ui-state-disabled');

      if (this.options.disableInputsOnToggle) {
        var checkboxes = this.menu.find(".ui-multiselect-checkboxes").get(0);
        var matchedInputs = [];
        var key = "ech-multiselect-disabled";
        var i = 0;
        if (flag) {
          // remember which elements this widget disabled (not pre-disabled)
          // elements, so that they can be restored if the widget is re-enabled.
          matchedInputs = checkboxes.querySelectorAll("input:enabled");
          for (i = 0; i < matchedInputs.length; i++) {
            matchedInputs[i].setAttribute(key, true);
            matchedInputs[i].setAttribute("disabled", "disabled");
            matchedInputs[i].setAttribute("aria-disabled", "disabled");
            matchedInputs[i].parentNode.className = matchedInputs[i].parentNode.className + " ui-state-disabled";
          }
        } else {
          matchedInputs = checkboxes.querySelectorAll("input:disabled");
          for (i = 0; i < matchedInputs.length; i++) {
            if (matchedInputs[i].hasAttribute(key)) {
              matchedInputs[i].removeAttribute(key);
              matchedInputs[i].removeAttribute("disabled");
              matchedInputs[i].removeAttribute("aria-disabled");
              matchedInputs[i].parentNode.className = matchedInputs[i].parentNode.className.replace(" ui-state-disabled", "");
            }
          }
        }
      }

      this.element.prop({
        'disabled': flag,
        'aria-disabled': flag
      });
    },
    // open the menu
    open: function (e) {
      var self = this;
      var button = this.button;
      var menu = this.menu;
      var speed = this.speed;
      var o = this.options;
      var args = [];

      // bail if the multiselectopen event returns false, this widget is disabled, or is already open
      if (this._trigger('beforeopen') === false || button.hasClass('ui-state-disabled') || this._isOpen) {
        return;
      }

      var $container = menu.find('.ui-multiselect-checkboxes');
      var effect = o.show;
      var pos = button.position();
      // figure out opening effects/speeds
      if ($.isArray(o.show)) {
        effect = o.show[0];
        speed = o.show[1] || self.speed;
      }

      // if there's an effect, assume jQuery UI is in use
      // build the arguments to pass to show()
      if (effect) {
        args = [effect, speed];
      }

      // set the scroll of the checkbox container
      $container.scrollTop(0).height(o.height);

      // show the menu, maybe with a speed/effect combo
      $.fn.show.apply(menu, args);

      this._resizeMenu();
      // positon
      this.position();


      // select the first not disabled option or the filter input if available
      var filter = this.header.find(".ui-multiselect-filter");
      if (filter.length) {
        filter.first().find('input').trigger('focus');
      } else if (this.labels.length) {
        this.labels.filter(':not(.ui-state-disabled)').eq(0).trigger('mouseover').trigger('mouseenter').find('input').trigger('focus');
      } else {
        this.header.find('a').first().trigger('focus');
      }


      button.addClass('ui-state-active');
      this._isOpen = true;
      this._trigger('open');
    },
    // close the menu
    close: function () {
      if (this._trigger('beforeclose') === false) {
        return;
      }

      var o = this.options;
      var effect = o.hide;
      var speed = this.speed;
      var args = [];

      // figure out opening effects/speeds
      if ($.isArray(o.hide)) {
        effect = o.hide[0];
        speed = o.hide[1] || this.speed;
      }

      if (effect) {
        args = [effect, speed];
      }

      $.fn.hide.apply(this.menu, args);
      this.button.removeClass('ui-state-active').trigger('blur').trigger('mouseleave');
      this._isOpen = false;
      this._trigger('close');
      this.button.trigger('focus');
    },
    enable: function () {
      this._toggleDisabled(false);
    },
    disable: function () {
      this._toggleDisabled(true);
    },
    checkAll: function (e) {
      this._toggleChecked(true);
      this._trigger('checkAll');
    },
    uncheckAll: function () {
      this._toggleChecked(false);
      this._trigger('uncheckAll');
    },
    getChecked: function () {
      return this.menu.find('input').filter(':checked');
    },
    getUnchecked: function () {
      return this.menu.find('input').not(':checked');
    },
    destroy: function () {
      // remove classes + data
      $.Widget.prototype.destroy.call(this);

      // unbind events
      $doc.unbind(this._namespaceID);
      $(this.element[0].form).unbind(this._namespaceID);

      this.button.remove();
      this.menu.remove();
      this.element.show();

      return this;
    },
    isOpen: function () {
      return this._isOpen;
    },
    widget: function () {
      return this.menu;
    },
    getButton: function () {
      return this.button;
    },
    getMenu: function () {
      return this.menu;
    },
    getLabels: function () {
      return this.labels;
    },
    addOption: function (attributes, text, groupLabel) {
      var $option = $("<option/>").attr(attributes).text(text);
      var optionNode = $option.get(0);
      if (groupLabel) {
        this.element.children("OPTGROUP").filter(function () {
          return $(this).prop("label") === groupLabel;
        }).append($option);
        this.menu.find(".ui-multiselect-optgroup").filter(function () {
          return $(this).find("a").text() === groupLabel;
        }).append(this._makeOption(optionNode));
      } else {
        this.element.append($option);
        this.menu.find(".ui-multiselect-checkboxes").append(this._makeOption(optionNode));
      }
      //update cached elements
      this.labels = this.menu.find('label');
      this.inputs = this.labels.children('input');
    },
    removeOption: function (value) {
      if (!value) {
        return;
      }
      this.element.find("option[value=" + value + "]").remove();
      this.labels.find("input[value=" + value + "]").parents("li").remove();

      //update cached elements
      this.labels = this.menu.find('label');
      this.inputs = this.labels.children('input');
    },
    hideOption: function (sValue) {
      if (!sValue) {
        return;
      }
      this.element.find('option[value={0}]'.format(sValue)).hide();
      this.labels.find('input[value={0}]'.format(sValue)).parents('li').hide().remove();
    },
    showOption: function (sValue) {
      if (!sValue) {
        return;
      }
      this.element.find('option[value={0}]'.format(sValue)).show();
      this.labels.find('input[value={0}]'.format(sValue)).parents('li').show();
    },
    showAll: function () {
      this.labels.find('input:not(:visible)').each(function(iIndex, eElement) {
        $(eElement).show();
        $(eElement).parents('li').show();
      });
    },
    hideAll: function () {
      this.labels.find('input:visible').each(function(iIndex, eElement) {
        $(eElement).hide();
        $(eElement).parents('li').hide().remove();
      });
    },
    position: function () {
      var pos = {
        my: "top",
        at: "bottom",
        of: this.button
      };
      if (!$.isEmptyObject(this.options.position)) {
        pos.my = this.options.position.my || pos.my;
        pos.at = this.options.position.at || pos.at;
        pos.of = this.options.position.of || pos.of;
      }
      if ($.ui && $.ui.position) {
        this.menu.position(pos);
      } else {
        pos = this.button.position();
        pos.top += this.button.outerHeight(false);
        this.menu.offset(pos);
      }
    },
    // react to option changes after initialization
    _setOption: function (key, value) {
      var menu = this.menu;

      switch (key) {
        case 'header':
          if (typeof value === 'boolean') {
            this.header[value ? 'show' : 'hide']();
          } else if (typeof value === 'string') {
            this.headerLinkContainer.children("li:not(:last-child)").remove();
            this.headerLinkContainer.prepend("<li>" + value + "</li>");
          }
          break;
        case 'checkAllText':
          menu.find('a.ui-multiselect-all span').eq(-1).text(value);
          break;
        case 'uncheckAllText':
          menu.find('a.ui-multiselect-none span').eq(-1).text(value);
          break;
        case 'height':
          this.options[key] = value;
          this._setMenuHeight();
          break;
        case 'minWidth':
        case 'menuWidth':
          this.options[key] = value;
          this._setButtonWidth();
          this._setMenuWidth();
          break;
        case 'selectedText':
        case 'selectedList':
        case 'noneSelectedText':
          this.options[key] = value; // these all needs to update immediately for the update() call
          this.update();
          break;
        case 'classes':
          menu.add(this.button).removeClass(this.options.classes).addClass(value);
          break;
        case 'multiple':
          menu.toggleClass('ui-multiselect-single', !value);
          this.options.multiple = value;
          this.element[0].multiple = value;
          this.uncheckAll();
          this.refresh();
          break;
        case 'position':
          this.position();
          break;
        case 'selectedListSeparator':
          this.options[key] = value;
          this.update(true);
          break;
      }

      $.Widget.prototype._setOption.apply(this, arguments);
    }
  });

})(jQuery);
