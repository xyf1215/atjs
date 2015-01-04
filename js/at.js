 ;(function($) {
	'use strict';

	// AT 类定义
	// =========================
	function AT(container, options) {
		this.options = options;
		this.$container = $(container);
		this.$textarea = this.$container.append("<textarea class=\"at-text\" maxlength=\"" + this.options.maxLength + "\" rows=\"4\"></textarea>").children(".at-text");
		this.$textShadow = this.$container.append("<div class=\"at-text-shadow\"><span class=\"before-text\"></span><i class=\"text-cursor\">|</i><span class=\"after-text\"></span></div>").children(".at-text-shadow");
		this.$atBox = $("body").append("<div class=\"at-box hidden\"></div>").children(".at-box");
		this.$textarea.on("keydown", $.proxy(this.controlInputText, this)).on("keyup click", $.proxy(this.inputText, this));
		this.init();
	}

	AT.VERSION = 1.0;

	AT.R_NAME = /[\u4E00-\u9FA5\w_]+/;

	AT.DEFAULTS = {
		"maxLength" : 800
	};

	AT.fn = AT.prototype;
	
	/**
	 * 初始化
	 */
	AT.fn.init = function() {
		// init dataloader
		for (var p in this.options.keyDefs) { // 为每一个key定义数据加载器
			this.options.keyDefs[p].dataLoader = new DataLoader($.extend({}, DataLoader.DEFAULTS, this.options.keyDefs[p]));
		}
	}
	
	/**
	 * 特殊按键的控制
	 */
	AT.fn.controlInputText = function(e) {
		if (this.isOpen()) {
			this.options.cancelInput = true;

			if (e.keyCode === 27) { // ESC
				this.close();
			} else if (e.keyCode === 13) { // 回车
				$("li.at-option-row.hover", this.$atBox).trigger("click");
			} else if (e.keyCode === 38 || e.keyCode === 40) { // 上下
				this.rollselectedOption(e.keyCode === 38 ? "up" : "down");
			} else {
				this.options.cancelInput = false;
			}

			if (this.options.cancelInput) {
				return false;
			}
		}
	}
	
	/**
	 * 文本输入
	 */
	AT.fn.inputText = function(e) {
		if (this.options.cancelInput) { // 如果是特殊按键，则不输入文字
			this.options.cancelInput = false;
			return;
		}

		var currentText = $(e.target).val(), 
			cursorPos = this.$textarea.position(), 
			prevAt = this.getPrevAtKey(currentText, cursorPos), 
			atOptions;

		if (prevAt.keyDef) {
			this.open(currentText, cursorPos, prevAt.keyDef, prevAt.value);
			return;
		}

		this.close();
	}
	
	/**
	 * 获取距本次输入最近的一次@
	 */
	AT.fn.getPrevAtKey = function(currentText, cursorPos) {
		var beforeText = currentText.substring(0, cursorPos.start),
			prevAt = { "value" : "" },
			index;
		for ( var i = beforeText.length - 1; i >= 0; i--) {
			index = beforeText.charAt(i);

			if (index === " " || index.indexOf("\n") >= 0) { // 如果是换行或空格
				break;
			}

			if (this.options.keyDefs[index]) {
				prevAt.keyDef = this.options.keyDefs[index];
				break;
			}

			prevAt.value = index + prevAt.value;
		}
		return prevAt;
	}
	
	/**
	 * 打开AT BOX
	 */
	AT.fn.open = function(currentText, cursorPos, keyDef, prefix) {
		var that = this;
		this.close();
		
		keyDef.dataLoader.exec(prefix, function(atOptions) {
			var beforeLoadCursorPos = that.$textarea.position();
			if (cursorPos.start === beforeLoadCursorPos.start && cursorPos.end === beforeLoadCursorPos.end) {
				that.render(currentText, cursorPos, atOptions);
			}
		});
	}
	
	/**
	 * 判断AT BOX 是否已经打开
	 */
	AT.fn.isOpen = function() {
		return !this.$atBox.hasClass("hidden");
	}
	
	/**
	 * 关闭 AT BOX
	 */
	AT.fn.close = function() {
		if (this.isOpen()) {
			this.$atBox.addClass("hidden");
			this.$atBox.empty();
		}
	}
	
	/**
	 * 获取AT BOX的位置
	 */
	AT.fn.getShowPosition = function(currentText, cursorPos) {
		var beforeText = (currentText.substring(0, cursorPos.start) || "").replace(/\n|\r/g, "</br>"), 
			afterText = (currentText.substring(cursorPos.start, currentText.length) || "").replace(/\n|\r/g, "</br>");

		$(".before-text", this.$textShadow).html(beforeText);
		$(".after-text", this.$textShadow).html(afterText);

		return this.calShowPosition();
	}
	
	/**
	 * 计算AT BOX的位置
	 */
	AT.fn.calShowPosition = function() {
		var $textCursor = $(".text-cursor", this.$textShadow), 
			textareaScrollTop = this.$textarea.scrollTop(), 
			$selectedOption = $("li", this.$atBox), 
			atBoxHeight = 28 * $selectedOption.length // li高度
				+ parseInt((this.$atBox.css("border-top") || "0").charAt(0))
				+ parseInt((this.$atBox.css("border-bottom") || "0").charAt(0)), 
			pos = {"top" : $textCursor.offset().top + $textCursor.height() + 5, "left" : $textCursor.offset().left};

		if (textareaScrollTop) { // 如果文本框有滚动条
			pos.top -= textareaScrollTop;
		}

		if ($(document).height() - pos.top < atBoxHeight) {
			pos.top = pos.top - $textCursor.height() - atBoxHeight - 10;
		}

		return pos;
	}
	
	/**
	 * 选中选项
	 */
	AT.fn.selectedOption = function(e) {
		var currentselectedOption = $(e.target).text() + " ", 
			cursorPos = this.$textarea.position(), 
			afterCursorPos = cursorPos, 
			currentText = this.$textarea.val(), 
			beforeText = currentText.substring(0, cursorPos.start) || "", 
			afterText = currentText.substring(cursorPos.start, currentText.length) || "", 
			prevAt = this.getPrevAtKey(currentText, cursorPos), delLength = 0;
		if (prevAt.keyDef) {
			
			if (prevAt.value) {
				delLength = beforeText.length;
				beforeText = beforeText.replace(new RegExp(prevAt.value + "$"), "");
				delLength -= beforeText.length;
			}

			if (afterText && afterText.charAt(0) === " ") {
				afterText = afterText.substring(1, afterText.length);
			}

			afterCursorPos.start += currentselectedOption.length - delLength;
			afterCursorPos.end += currentselectedOption.length - delLength;

			this.$textarea.val(beforeText + currentselectedOption + afterText);
			this.$textarea.position(afterCursorPos);
			this.close();
		}
	}

	/**
	 * 悬停
	 */
	AT.fn.hoverOption = function(e) {
		var $currentHoverOption = $(e.target);
		$currentHoverOption.addClass("hover").siblings("li.at-option-row").removeClass("hover");
	}

	/**
	 * 上下移动选项
	 */
	AT.fn.rollselectedOption = function(direction) {
		var $allselectedOption = $("li.at-option-row", this.$atBox), 
			$currentHoverOption, 
			index;

		if ($allselectedOption.length > 1) {
			$currentHoverOption = $("li.at-option-row.hover", this.$atBox);
			
			index = $allselectedOption.index($currentHoverOption);

			if (direction === "up") {
				index--;
				index = index < 0 ? $allselectedOption.length - 1 : index;
			} else {
				index++;
				index = index > $allselectedOption.length - 1 ? 0 : index;
			}

			$allselectedOption.eq(index).addClass("hover").siblings("li.at-option-row").removeClass("hover");
		}
	}

	/**
	 * 渲染AT BOX
	 */
	AT.fn.render = function(currentText, cursorPos, atOptions) {
		if (atOptions.length) {
			this.$atBox.append("<ul>" + atOptions.join("") + "</ul>");
			this.$atBox.css(this.getShowPosition(currentText, cursorPos));
			$("li.at-option-row", this.$atBox).on("click", $.proxy(this.selectedOption, this)).on("hover", $.proxy(this.hoverOption, this));
			this.$atBox.removeClass("hidden");
		}
	}

	// AT 插件定义
	// ==========================

	function Plugin(option) {
		return this.each(function() {
			var $this = $(this), 
				data = $this.data('at'), 
				options = $.extend({}, AT.DEFAULTS, $this.data(), typeof option == 'object' && { "keyDefs" : option });
			!data && $this.data('at', (data = new AT(this, options)));
		})
	}

	var old = $.fn.at;
	$.fn.at = Plugin;
	$.fn.at.Constructor = AT;

	// AT 防冲突
	// ====================
	$.fn.at.noConflict = function() {
		$.fn.at = old;
		return this;
	}

	// DataLoader 插件
	// ====================

	function DataLoader(keyDef) {
		this.keyDef = keyDef;
		this.loaded = false;
		this.loading = false;
	}
	
	DataLoader.DEFAULTS = {
		"showrows" : 10
	}
	
	DataLoader.fn = DataLoader.prototype;
	
	/**
	 * 加载数据
	 */
	DataLoader.fn.exec = function(prefix, callback) {
		var atOptions;
		
		if (this.needDownload()) {
			this.download(prefix, callback);
			return;
		}
		
		if (!this.loading) {
			
			atOptions = this.process(this.keyDef.data, prefix);
			
			callback(atOptions);
		}
	}
	
	DataLoader.fn.needDownload = function() {
		return this.keyDef.txn && this.keyDef.nodename && !this.loading && !this.loaded;
	}
	
	DataLoader.fn.download = function(prefix, callback) {
		var that = this;
		this.loading = true;
		$.ajax({
			url: this.keyDef.txn,
			type: "post",
			cache:  false,
			dataType : "json",
			success: function(data) {
				var atOptions = [];
				if (data) {
					for (var i=0;data[i]!= null;i ++) {
						atOptions.push(data[i].codevalue);
					}
				}
				
				that.keyDef.data = atOptions;
					
				that.loaded = true;
				that.loading = false;
				that.exec(prefix, callback);
			},
			error: function(e) {
				alert(e);
			}
		});
	}
	
	
	/**
	 * 处理数据
	 */
	DataLoader.fn.process = function(atData, prefix) {
		var atOptions = [], 
			match,
			data,
			format;

		atData = atData || [];

		for ( var i = 0; i < atData.length; i++) {
			data = atData[i] + "";
			format = "";

			if (prefix) {
				if (AT.R_NAME.test(prefix) && (match = new RegExp(prefix).exec(data))) {
					format = data.replace(match[0], "<strong class=\"red\">" + match + "</strong>");
				}
			} else {
				format = data;
			}
			
			if (format) {
				atOptions.push(this.getLiTemplate("at-option-row" + (atOptions.length ? "" : " hover"), name, format));
			}
		} 
		
		if (atOptions.length) {
			atOptions.splice(this.keyDef.showrows);
			if (atOptions.length === 1) {
				atOptions.splice(0, 0, this.getLiTemplate("at-option-title", "", "轻敲空格完成输入"));
			} else if (this.keyDef.title) {
				atOptions.splice(0, 0, this.getLiTemplate("at-option-title", "", this.keyDef.title));
			}
		}
		
		return atOptions;
	}
	
	/**
	 * 获取模板
	 */
	DataLoader.fn.getLiTemplate = function(clazz, title, value) {
		var template = "<li class='" + (clazz || "") + "' title='" + (title || "") + "'>" + (value || "") + "</li>"
		return template;
	}

})(jQuery);

$.fn.extend({
	position : function(position) {
		if (!this.is("textarea")) {
			return;
		}

		var textarea = this[0], rangeData = {
			text : "",
			start : 0,
			end : 0
		};
		textarea.focus();

		if (position) { // set
			if (textarea.setSelectionRange) {
				textarea.selectionStart = position.start;
				textarea.selectionEnd = position.end;
			} else if (document.selection) {
				var oR = document.body.createTextRange();
				oR.moveToElementText(textarea);
				oR.moveStart('character', position.start);
				oR.collapse(true);
				oR.select();
			}
		}

		if (textarea.setSelectionRange) { // W3C
			rangeData.start = textarea.selectionStart;
			rangeData.end = textarea.selectionEnd;
			rangeData.text = (rangeData.start != rangeData.end) ? textarea.value .substring(rangeData.start, rangeData.end) : "";
		} else if (document.selection) { // IE
			var i, oS = document.selection.createRange(),
			// Don't: oR = textarea.createTextRange()
			oR = document.body.createTextRange();
			oR.moveToElementText(textarea);

			rangeData.text = oS.text;
			rangeData.bookmark = oS.getBookmark();

			// object.moveStart(sUnit [, iCount])
			// Return Value: Integer that returns the number of units moved.
			for (i = 0; oR.compareEndPoints('StartToStart', oS) < 0	&& oS.moveStart("character", -1) !== 0; i++) {
				// Why? You can alert(textarea.value.length)
				if (textarea.value.charAt(i) == '\n') {
					i++;
				}
			}
			rangeData.start = i;
			rangeData.end = rangeData.text.length + rangeData.start;
		}
		return rangeData;
	}
});