var SApp = {
	version: '1.0',
	//参数设置
	settings: {
		transitionType: 'slide',
		//自定义动画时的默认动画时间(非page转场动画时间)
		transitionTime: 250,
		//自定义动画时的默认动画函数(非page转场动画函数)
		transitionTimingFunc: 'ease-in',
		//page模板的远程路径{#id: href,#id: href}
		remotePage: {},
		startPage: "#main"
	},
	//是否有打开的侧边菜单
	hasMenuOpen: false,
	//是否有打开的弹出框
	hasPopupOpen: false,

	/**
	 * 启动Jingle
	 * @param opts {object}
	 */
	launch: function() {
		this.Element.init("#aside_container");
		this.Element.init("#section_container");
		this.Router.init();
		this.Menu.init();
	}

};
SApp.Router = (function() {
	var _history = [];
	/**
	 * 初始化events、state
	 */
	var init = function() {
		$(window).on('popstate', _popstateHandler);
		//阻止含data-target或者href以'#'开头的的a元素的默认行为
		$(document).on('click', 'a', function(e) {
			var target = $(this).data('target'),
				href = $(this).attr('href');
			if (!href || href.match(/^#/) || target) {
				e.preventDefault();
				_targetHandler.call(this);
			}
		});
		//$(document).on('click', 'a[data-target]', _targetHandler);
		_add2History(SApp.settings.startPage, true);
	}

	/**
	 * 处理浏览器的后退事件
	 * 前进事件不做处理
	 * @private
	 */
	var _popstateHandler = function(e) {
		if (e.state && e.state.hash) {
			var hash = e.state.hash;
			if (_history[1] && hash === _history[1].hash) { //存在历史记录，证明是后退事件
				SApp.hasMenuOpen && SApp.Menu.hide(); //关闭当前页面的菜单
				SApp.hasPopupOpen && SApp.Popup.close(); //关闭当前页面的弹出窗口
				back();
			} else { //其他认为是非法后退或者前进
				return;
			}
		} else {
			return;
		}

	}
	var _targetHandler = function() {
		var _this = $(this),
			target = _this.attr('data-target'),
			href = _this.attr('href');

		switch (target) {
			case 'section':
				_showSection(href);
				break;
			case 'article':
				_showArticle(href, _this);
				break;
			case 'menu':
				_toggleMenu(href);
				break;
			case 'back':
				window.history.go(-1);
				break;
		}
	}

	/**
	 * 跳转到新页面
	 * @param hash 新page的'#id'
	 */
	var _showSection = function(hash) {
			if (SApp.hasMenuOpen) { //关闭菜单后再转场

				_howChange(hash, false);
				SApp.Menu.hide(200, function() {
					_howChange(hash, true);
				});
				return;
			}
		}
		/**
		 * 后退
		 */
	var _howChange = function(hash, isAnim) {
		//读取hash信息
		var hashObj = _parseHash(hash);
		var current = _history[0];
		//同一个页面,则不重新加载
		if (typeof current !== "undefined" && current.hash === hashObj.hash) {
			return;
		} else {
			//切换卡片
			isAnim ? _changePage(current.tag, hashObj.tag) : SApp.Transition.change(current.tag, hashObj.tag);
			_add2History(hash, false);
		}
	}
	var back = function() {
		_changePage(_history.shift().tag, _history[0].tag, true)
	}
	var _changePage = function(current, target, isBack) {
			SApp.Transition.run(current, target, isBack);
		}
		/**
		 * 缓存访问记录
		 */
	var _add2History = function(hash, noState) {
		var hashObj = _parseHash(hash);
		if (noState) { //不添加浏览器历史记录
			_history.shift(hashObj);
			window.history.replaceState(hashObj, '', hash);
		} else {
			window.history.pushState(hashObj, '', hash);
		}
		_history.unshift(hashObj);
	}

	/**
	 * 激活href对应的article
	 * @param href #id
	 * @param el 当前锚点
	 */
	var _showArticle = function(href, el) {
		var article = $(href);
		if (article.hasClass('active')) return;
		el.addClass('active').siblings('.active').removeClass('active');
		var activeArticle = article.addClass('active').siblings('.active').removeClass('active');
		article.trigger('articleshow');
		activeArticle.trigger('articlehide');
	}

	var _toggleMenu = function(hash) {
		SApp.hasMenuOpen ? SApp.Menu.hide() : SApp.Menu.show(hash);
	}

	var _parseHash = function(hash) {
		var tag, query, param = {},
			arr = hash.split('#');

		tag = '#' + arr.pop();
		if (arr.length > 0) {
			var seg, s;
			query = arr.pop();
			if (query.indexOf('?') > -1)
				seg = query.substring(1).split('&');
			else
				seg = query.split('&');
			for (var i = 0; i < seg.length; i++) {
				if (!seg[i]) continue;
				s = seg[i].split('=');
				param[s[0]] = s[1];
			}
		}
		return {
			hash: hash,
			tag: tag,
			query: query,
			param: param
		}
	}
	return {
		init: init,
		goTo: _showSection,
		showArticle: _showArticle,
		back: back
	}
})();
SApp.Transition = (function() {
	var isBack, $current, $target, transitionName,
		animationClass = {
			//[[currentOut,targetIn],[currentOut,targetIn]]
			slide: [
				['slideLeftOut', 'slideLeftIn'],
				['slideRightOut', 'slideRightIn']
			],
			cover: [
				['', 'slideLeftIn'],
				['slideRightOut', '']
			],
			slideUp: [
				['', 'slideUpIn'],
				['slideDownOut', '']
			],
			slideDown: [
				['', 'slideDownIn'],
				['slideUpOut', '']
			],
			popup: [
				['', 'scaleIn'],
				['scaleOut', '']
			]
		};

	var _doTransition = function() {
		//触发 beforepagehide 事件
		$current.trigger('beforepagehide', [isBack]);
		//触发 beforepageshow 事件
		$target.trigger('beforepageshow', [isBack]);
		var c_class = transitionName[0] || 'empty',
			t_class = transitionName[1] || 'empty';
		//$current.bind('webkitAnimationEnd.jingle', _finishTransition).addClass('anim ' + c_class);
		$current.animate(c_class, 300, _finishTransitionCurrent);
		$target.addClass('active').animate(t_class, 300, _finishTransitionTarget);
		//$target.addClass('anim animating ' + t_class);
	}
	var _finishTransitionCurrent = function() {
		//            $current.off('webkitAnimationEnd.jingle');
		//reset class
		//            $current.attr('class', '');
		$current.removeClass('active');
		//add custom events
		!$current.data('init') && $current.trigger('pageinit').data('init', true);
		//触发pagehide事件
		$current.trigger('pagehide', [isBack]);

		$current.find('article.active').trigger('articlehide');

		$current = null; //释放
	}
	var _finishTransitionTarget = function() {
		//            $target.off('webkitAnimationEnd.jingle');
		//reset class
		//            $target.attr('class', 'active');
		//add custom events
		!$target.data('init') && $target.trigger('pageinit').data('init', true);
		//触发pageshow事件
		$target.trigger('pageshow', [isBack]);

		$target.find('article.active').trigger('articleshow');

		$target = null; //释放
	}

	/**
	 * 执行转场动画，动画类型取决于目标page上动画配置(返回时取决于当前page)
	 * @param current 当前page
	 * @param target  目标page
	 * @param back  是否为后退
	 */
	var run = function(current, target, back) {
		//关闭键盘
		$(':focus').trigger('blur');
		isBack = back;
		$current = $(current);
		$target = $(target);
		var type = isBack ? $current.attr('data-transition') : $target.attr('data-transition');
		type = type || SApp.settings.transitionType;
		//后退时取相反的动画效果组
		transitionName = isBack ? animationClass[type][1] : animationClass[type][0];
		_doTransition();
	}
	var change = function(current, target) {
			//关闭键盘
			$(':focus').trigger('blur');
			$current = $(current);
			$target = $(target);
			//$current.bind('webkitAnimationEnd.jingle', _finishTransition).addClass('anim ' + c_class);
			$current.removeClass('active');
			$target.addClass('active');
			$current = null; //释放
			$target = null; //释放
		}
		/**
		 * 添加自定义转场动画效果
		 * @param name  动画名称
		 * @param currentOut 正常情况下当前页面退去的动画class
		 * @param targetIn   正常情况下目标页面进入的动画class
		 * @param backCurrentOut 后退情况下当前页面退去的动画class
		 * @param backCurrentIn 后退情况下目标页面进入的动画class
		 */
	var addAnimation = function(name, currentOut, targetIn, backCurrentOut, backCurrentIn) {
		if (animationClass[name]) {
			console.error('该转场动画已经存在，请检查你自定义的动画名称(名称不能重复)');
			return;
		}
		animationClass[name] = [
			[currentOut, targetIn],
			[backCurrentOut, backCurrentIn]
		];
	}
	return {
		run: run,
		add: addAnimation,
		change: change
	}

})();
SApp.anim = function(el, animName, duration, ease, callback) {
	var d, e, c;
	var len = arguments.length;
	for (var i = 2; i < len; i++) {
		var a = arguments[i];
		var t = $.type(a);
		t == 'number' ? (d = a) : (t == 'string' ? (e = a) : (t == 'function') ? (c = a) : null);
	}
	$(el).animate(animName, d || SApp.settings.transitionTime, e || SApp.settings.transitionTimingFunc, c);
}

SApp.Scroll = (function() {
	var iscrollCache = {},
		index = 1,
		scroll, scrollId, $el,
		options = {
			probeType: 3,
			mouseWheel: true,
			scrollbars: true,
			interactiveScrollbars: true,
			shrinkScrollbars: 'clip', //'scale',
			fadeScrollbars: true,
			hScroll: false,
			useTransform: true
		};
	var createIScroll = function(selector, opts) {
		$el = $(selector)
		scrollId = $el.data('iscroll_');
		//滚动组件使用频繁，缓存起来节省开销
		if (scrollId && iscrollCache[scrollId]) {
			scroll = iscrollCache[scrollId];
			return scroll;
		} else {
			scrollId = 'iscroll_' + index++;
			$el.data('iscroll_', scrollId);
			scroller = new IScroll($el[0], options);

			iscrollCache[scrollId] = {
				scroller: scroller,
				destroy: function() {
					scroller.destroy();
					delete iscrollCache[scrollId];
				}
			};
			scroll = iscrollCache[scrollId];
			return scroll;
		};
	}

	var getIScroll = function(selector) {
		var scrollId = $(selector).data('iscroll_');
		if (scrollId && iscrollCache[scrollId])
			return iscrollCache[scrollId];
		return null;
	}
	return {
		getAll: iscrollCache,
		get: getIScroll,
		create: createIScroll
	}
})();

/**
 * 初始化页面组件元素
 */
SApp.Element = (function() {
	var SELECTOR = {
			'icon': '[data-icon]',
			'scroll': '[data-role="scroll"]',
			'list': '[data-role="list"]',
			'toggle': '.toggle',
			'checkbox': '[data-checkbox]',
			'buttongroup': '[data-role="buttongroup"]'
		}
		/**
		 * 初始化容器内组件
		 * @param {String} 父元素的css选择器
		 * @param {Object} 父元素或者父元素的zepto实例
		 */
	var init = function(selector) {
		//if (!selector) {
		//iscroll 必须在元素可见的情况下才能初始化
		$(selector).on('articleshow', 'article.active', function() {
			$.map(_getMatchElements($(this), SELECTOR.scroll), function(el) {
				SApp.Scroll.create(el); //.scroller; //.scrollTo(0, 0);
			});
		});
		$(selector).on('asideshow', 'aside.active', function() {
			$.map(_getMatchElements($(this), SELECTOR.scroll), function(el) {
				SApp.Scroll.create(el); //.scroller; //.scrollTo(0, 0);
			});
		});
		//};
		var $el = $(selector || 'body');
		if ($el.length == 0) return;
		$.map(_getMatchElements($el, SELECTOR.buttongroup), _init_button_group);
		$.map(_getMatchElements($el, SELECTOR.list), _init_list);

		$.map(_getMatchElements($el, SELECTOR.icon), _init_icon);
		$.map(_getMatchElements($el, SELECTOR.toggle), _init_toggle);
		$.map(_getMatchElements($el, SELECTOR.checkbox), _init_checkbox);
		$el = null;
	}

	/**
	 * 初始化按钮组(绑定事件)
	 */
	var _init_button_group = function(el) {
		$(el).on('click', '.button', function() {
			var $this = $(this);
			if ($this.hasClass('active')) return;
			$this.addClass('active').siblings('.active').removeClass('active').parent().trigger('change', [$this]);
		});
	}
	var _init_list = function(el) {
		var $el = $(el),
			$li = $el.children('li'),
			icon = $el.data('pos');
		$el.addClass("list_ul");
		$li.addClass("item_li");
		icon && $el.addClass(icon);
	}

	/**
	 * 自身与子集相结合
	 */
	var _getMatchElements = function($el, selector) {
		return $el.find(selector).add($el.filter(selector));
	}

	/**
	 * 构造icon组件
	 */
	var _init_icon = function(el) {
			var $el = $(el),
				$icon = $el.children('i.icon'),
				icon = $el.data('icon');
			if ($icon.length > 0) { //已经初始化，就更新icon
				$icon.attr('class', 'icon ' + icon);
			} else {
				$el.prepend('<i class="icon ' + icon + '"></i>');
			}
		}
		/**
		 * 构造toggle切换组件
		 */
	var _init_toggle = function(el) {
		var $el = $(el);
		if ($el.find('div.toggle-handle').length > 0) { //已经初始化
			return;
		}
		var name = $el.attr('name');
		//添加隐藏域，方便获取值
		if (name) {
			$el.append('<input style="display: none;" name="' + name + '" value="' + $el.hasClass('active') + '"/>');
		}
		$el.append('<div class="toggle-handle"></div>');
		$el.tap(function() {
			var $t = $(this),
				v = !$t.hasClass('active');
			$t.toggleClass('active').trigger('toggle', [v]); //定义toggle事件
			$t.find('input').val(v);
		})
	}


	var _init_checkbox = function(el) {
		var $el = $(el);
		var value = $el.data('checkbox');
		if ($el.find('i.icon').length > 0) {
			return;
		}
		$el.prepend('<i class="icon checkbox-' + value + '"></i>');
		$el.on('tap', function() {
			var status = ($el.data('checkbox') == 'checked') ? 'unchecked' : 'checked';
			$el.data('checkbox', status).find('i.icon').attr('class', 'icon checkbox-' + status);
			//自定义change事件
			$el.trigger('change');
		});

	}

	return {
		init: init,
		initControlGroup: _init_button_group,
		icon: _init_icon,
		toggle: _init_toggle
	}
})();

/**
 * 侧边菜单
 */
SApp.Menu = (function() {
	var $asideContainer, $sectionContainer, $sectionMask;
	var init = function() {
			$asideContainer = $('#aside_container');
			$sectionContainer = $('#section_container');
			$sectionMask = $('<div id="section_container_mask"></div>').appendTo('#section_container');
			//添加各种关闭事件
			$sectionMask.on('click', hideMenu);
			$asideContainer.on('swipeRight', 'aside', function() {
				if ($(this).data('position') == 'right') {
					hideMenu();
				}
			});
			$asideContainer.on('swipeLeft', 'aside', function() {
				if ($(this).data('position') != 'right') {
					hideMenu();
				}
			});
			//      $asideContainer.on('click', '.aside-close', hideMenu);
		}
		/**
		 * 打开侧边菜单
		 * @param selector css选择器或element实例
		 */
	var showMenu = function(selector) {

			var $aside = $(selector).addClass('active').trigger('asideshow'),
				transition = $aside.data('transition'), // push overlay  reveal
				position = $aside.data('position') || 'left',
				width = $aside.width(),
				translateX = position == 'left' ? width + 'px' : '-' + width + 'px';

			if (transition == 'overlay') {
				SApp.anim($aside, {
					translateX: '0%'
				});
			} else if (transition == 'reveal') {
				SApp.anim($sectionContainer, {
					translateX: translateX
				});
			} else { //默认为push
				SApp.anim($aside, {
					translateX: '0%'
				});
				SApp.anim($sectionContainer, {
					translateX: translateX
				});
			}
			$sectionMask.show();

			SApp.hasMenuOpen = true;
		}
		/**
		 * 关闭侧边菜单
		 * @param duration {int} 动画持续时间
		 * @param callback 动画完毕回调函数
		 */
	var hideMenu = function(duration, callback) {
		var $aside = $('#aside_container aside.active'),
			transition = $aside.data('transition'), // push overlay  reveal
			position = $aside.data('position') || 'left',
			translateX = position == 'left' ? '-100%' : '100%';

		var _finishTransition = function() {
			$aside.removeClass('active');
			SApp.hasMenuOpen = false;
			$sectionMask.hide();
			callback && callback.call(this);
		};

		if (transition == 'overlay') {
			SApp.anim($aside, {
				translateX: translateX
			}, duration, _finishTransition);
		} else if (transition == 'reveal') {
			SApp.anim($sectionContainer, {
				translateX: '0'
			}, duration, _finishTransition);
		} else { //默认为push
			SApp.anim($aside, {
				translateX: translateX
			}, duration);
			SApp.anim($sectionContainer, {
				translateX: '0'
			}, duration, _finishTransition);
		}


	}


	return {
		init: init,
		show: showMenu,
		hide: hideMenu
	}
})();

window.SApp = SApp;