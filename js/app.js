/* vim: set tabstop=4 shiftwidth=4: */
/*jshint mootools:true */
var app         =   window.app || (window.app = {}),
    Scrollable  =   window.Scrollable,
    Toggle      =   window.Toggle;

(function () {
    'use strict';
    
    app.version = '0.0.0';
    
    window.addEvent('load', function () {
        $$('.toggle').each(function (toggle) {
            new Toggle(toggle.getElements('.toggle-title')[0],
                        toggle.getElements('.toggle-target')[0]);
        });
        
        app.Controller.Input.init();
        app.Controller.Input.getInput();
        app.Controller.TableNav.init();
        
        new Scrollable($('app-grid'));
        new Scrollable($('channel-grid-body'));

        new Drag($('app-channel-box'));
    });
}) ();
