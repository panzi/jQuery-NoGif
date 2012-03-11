(function ($, undefined) {
	"use strict";

	var images = {};
	var queue  = [];

	function queueNext () {
		dequeue(this);
		if (queue.length > 0) {
			queue.shift().nogifLoad();
		}
	}

	function enqueue (image) {
		image.on("nogif:load",queueNext);
		if (queue.length === 0) {
			image.nogifLoad();
		}
		queue.push(image);
	}

	function dequeue (image) {
		image.off("nogif:load",queueNext);
		for (var i = 0; i < queue.length;) {
			if (queue[i].is(image)) {
				queue.splice(i,1);
			}
			else {
				++ i;
			}
		}
	}

	function loadFrame (src, callback) {
		var loader = images[src];
		if (!loader) {
			loader = images[src] = {
				image: new Image(),
				loaded: false,
				callbacks: []
			};

			loader.image.onload = function () {
				loader.loaded = true;
				for (var i = 0; i < loader.callbacks.length; ++ i) {
					loader.callbacks[i](src);
				}
			};
			
			loader.image.src = src;
		}

		if (callback) {
			if (loader.loaded) {
				callback(src);
			}
			else {
				loader.callbacks.push(callback);
			}
		}
	}

	function option (element, options, name, defaultValue, parse) {
		if (name in options) {
			return options[name];
		}
		var value = element.attr("data-"+name);
		if (value === undefined) {
			return defaultValue;
		}

		return parse ? parse(value) : value;
	}

	function parseBoolean (s) {
		switch ($.trim(s).toLowerCase()) {
			case "true":
			case "yes":
			case "on":
			case "1":
				return true;

			case "false":
			case "no":
			case "off":
			case "0":
				return false;
			
			default:
				return undefined;
		}
	}

	function init (element, options) {
		var fps = option(element, options, 'fps', 25, parseFloat);
		var frame_duration = 1000 / fps;
		var autoplay = option(element, options, 'autoplay', true, parseBoolean);
		var repeat   = option(element, options, 'repeat',   true, parseBoolean);
		var preload  = option(element, options, 'preload', 'auto');
		var sequence = [];

		var image = element;
		if (!image.is('img')) {
			image = $(new Image());
			element.append(image);
		}

		if ($.isArray(options.sequence)) {
			for (var i = 0; i < options.sequence.length; ++ i) {
				var frame = options.sequence[i];
				if (typeof(frame) === "string") {
					frame = {
						src: frame,
						duration: frame_duration
					};
				}
				else if (!('duration' in frame)) {
					frame.duration = frame_duration;
				}
				sequence.push(frame);
			}
		}
		else {
			var pattern = options.sequence.pattern;
			var padding = (/(#+)/.exec(pattern)||['',''])[1].length;

			for (var i = 0; i < options.sequence.length; ++ i) {
				var nr = String(i);
				if (nr.length < padding) {
					nr = new Array(padding - nr.length + 1).join('0')+nr;
				}
				sequence.push({
					src: pattern.replace(/#+/, nr),
					duration: frame_duration
				});
			}
		}

		if (!image.attr('src')) {
			image.attr('src',sequence[0].src);
		}

		image.addClass("nogif");

		if (options.controls) {
			var controls;
			if (image === element) {
				controls = $("<div></div>");
				image.replaceWith(controls);
				controls.append(image);
			}
			else {
				controls = element;
			}
			controls.addClass("nogif-controls");
			var progress = $("<div class='nogif-progress'></div>");
			var progressBar = $("<div class='nogif-progress-bar' style='display:none;'></div>");
			progressBar.append(progress);
			controls.append(progressBar);

			controls.on("click",clickControls);
			controls.on("nogif:progress",paintProgress);
			controls.on("nogif:loadstart",showProgress);
			controls.on("nogif:load",hideProgress);
		}
		
		image.data("nogif", {
			sequence: sequence,
			currentIndex: 0,
			timer: null,
			repeat: repeat,
			autoplay: autoplay,
			readyState: "start"
		});

		switch (preload) {
			case "auto":
				image.nogifLoad();
				break;

			case "queued":
				enqueue(image);
				break;

			case "none":
				break;
		}
	}

	$.fn.nogif = function (options) {
		if (!options) options = {};
		var element = this;
		var src = option(element, options, 'src');

		if (src) {
			$.ajax(src, {
				dataType: 'json',
				success: function (data) {
					init(element, $.extend(data,options));
				}
			});
		}
		else {
			init(element, options);
		}
	};

	function clickControls (event) {
		if (event.which === 1) {
			$(this).find("img.nogif").nogifPlayPause();
			event.preventDefault();
		}
	}

	function showProgress () {
		var controls = $(this);
		controls.find(".nogif-progress-bar").css({
			display: '',
			visibility: 'hidden'
		});
		setTimeout(function () {
			if (controls.find("img.nogif").data("nogif").readyState !== "loaded") {
				controls.find(".nogif-progress-bar").css({
					visibility: ''
				});
			}
		}, 250);
	}
	
	function hideProgress () {
		$(this).find(".nogif-progress-bar").hide();
	}

	function paintProgress (event, loaded, length, src) {
		var progress = $(this).find(".nogif-progress");
		progress.css("width", Math.round(progress.parent().innerWidth() * (loaded / length))+"px");
	}

	$.fn.nogifLoad = function () {
		var data = this.data("nogif");
		if (data.readyState !== "start") return;
		data.readyState = "loading";

		dequeue(this);
		var image = this;
		var count = 0;
		var callback = function (src) {
			++ count;
			image.trigger("nogif:progress",[count,data.sequence.length,src]);
			if (count === data.sequence.length) {
				data.readyState = "loaded";
				image.trigger("nogif:load",[src]);
				if (data.autoplay) {
					image.nogifPlay();
				}
			}
		};
		image.trigger("nogif:loadstart");
		for (var i = 0; i < data.sequence.length; ++ i) {
			loadFrame(data.sequence[i].src, callback);
		}
	};

	$.fn.nogifPlaying = function () {
		return this.data("nogif").timer !== null;
	};
	
	$.fn.nogifPlay = function () {
		var data = this.data("nogif");
		if (data.timer !== null) return;
		if (data.readyState === "start") {
			data.autoplay = true;
			this.nogifLoad();
			return;
		}
		else if (data.readyState !== "loaded") {
			return;
		}

		this.trigger("nogif:play");
		
		var image = this;
		function renderFrame () {
			var frame = data.sequence[data.currentIndex];
			image.attr('src',frame.src);
			
			++ data.currentIndex;
			if (data.currentIndex === data.sequence.length) {
				data.currentIndex = 0;
				data.timer = null;

				if (data.repeat) {
					image.trigger("nogif:repeat");
				}
				else {
					image.trigger("nogif:ended");
					return;
				}
			}

			data.timer = setTimeout(renderFrame, frame.duration);
		}

		renderFrame();
	};

	$.fn.nogifStop = function () {
		var data = this.data("nogif");
		if (data.timer === null) return;
		clearTimeout(data.timer);
		data.timer = null;
		data.currentIndex = 0;
		this.attr("src",data.sequence[0].src);
		this.trigger("nogif:stop");
	};
	
	$.fn.nogifPause = function () {
		var data = this.data("nogif");
		if (data.timer === null) return;
		clearTimeout(data.timer);
		data.timer = null;
		this.trigger("nogif:pause");
	};
	
	$.fn.nogifPlayPause = function () {
		var data = this.data("nogif");
		if (data.timer === null) {
			this.nogifPlay();
		}
		else {
			this.nogifPause();
		}
	};

	$(document).ready(function () {
		var images = $(".nogif");
		for (var i = 0; i < images.length; ++ i) {
			var image = $(images[i]);
			if (!image.data("nogif")) {
				image.nogif({});
			}
		}
	});
})(jQuery);
