/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comkarsanqm/taskmanage/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});


