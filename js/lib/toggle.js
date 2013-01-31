/* vim: set tabstop=4 shiftwidth=4: */
/*jshint mootools:true */

/**
 * Creates a toggleable element
 * 
 * -----------------------------------------------------------------------------
 * Layout
 * -----------------------------------------------------------------------------
 *  Toggle
 *  - constructor(title, target)
 */
(function (exports) {
    'use strict';
    
    var slideOptions = {
            duration: 'short',
            link: 'chain',
            resetHeight: true
        },
        Toggle = new Class({
            initialize: function (title, target) {
                _.bindAll(this);
                this._slideObj  =   new Fx.Slide(target, slideOptions);
                this._title     =   title;
                
                title.addEvent('click', this.toggle);
            },
            hide: function () {
                this._slideObj.slideOut()
                this._title.removeClass('active');
            },
            show: function () {
                this._slideObj.slideIn();
                this._title.addClass('active');
            },
            toggle: function () {
                if (this._title.hasClass('active')) {
                    this.hide();
                } else {
                    this.show();
                }
            }
        });
    
    exports.Toggle = Toggle;
}) (this);
