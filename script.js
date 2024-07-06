(function() {

  //----------------------------------------lava lamp------------------------------------------------------//
    "use strict";
  
    var lava0;
    var ge1doot = {
      screen: {
        elem:     null,
        callback: null,
        ctx:      null,
        width:    0,
        height:   0,
        left:     0,  
        top:      0,
        init: function (id, callback, initRes) {
          this.elem = document.getElementById(id);
          this.callback = callback || null;
          if (this.elem.tagName == "CANVAS") this.ctx = this.elem.getContext("2d");
          window.addEventListener('resize', function () {
            this.resize();
          }.bind(this), false);
          this.elem.onselectstart = function () { return false; }
          this.elem.ondrag        = function () { return false; }
          initRes && this.resize();
          return this;
        },
        resize: function () {
          var o = this.elem;
          this.width  = o.offsetWidth;
          this.height = o.offsetHeight;
          for (this.left = 0, this.top = 0; o != null; o = o.offsetParent) {
            this.left += o.offsetLeft;
            this.top  += o.offsetTop;
          }
          if (this.ctx) {
            this.elem.width  = this.width;
            this.elem.height = this.height;
          }
          this.callback && this.callback();
        }
      }
    }
  
    // Point constructor
    var Point = function(x, y) {
      this.x = x;
      this.y = y;
      this.magnitude = x * x + y * y;
      this.computed = 0;
      this.force = 0;
    };
    Point.prototype.add = function(p) {
      return new Point(this.x + p.x, this.y + p.y);
    };
  
    // Ball constructor
    var Ball = function(parent) {
      var min = .1;
      var max = 1.5;
      this.vel = new Point(
        (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.25), (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random())
      );
      this.pos = new Point(
        parent.width * 0.2 + Math.random() * parent.width * 0.6,
        parent.height * 0.2 + Math.random() * parent.height * 0.6
      );
      this.size = (parent.wh / 15) + ( Math.random() * (max - min) + min ) * (parent.wh / 15);
      this.width = parent.width;
      this.height = parent.height;
    };
  
    // move balls
    Ball.prototype.move = function() {
  
      // bounce borders
      if (this.pos.x >= this.width - this.size) {
        if (this.vel.x > 0) this.vel.x = -this.vel.x;
        this.pos.x = this.width - this.size;
      } else if (this.pos.x <= this.size) {
        if (this.vel.x < 0) this.vel.x = -this.vel.x;
        this.pos.x = this.size;
      }
  
      if (this.pos.y >= this.height - this.size) {
        if (this.vel.y > 0) this.vel.y = -this.vel.y;
        this.pos.y = this.height - this.size;
      } else if (this.pos.y <= this.size) {
        if (this.vel.y < 0) this.vel.y = -this.vel.y;
        this.pos.y = this.size;
      }
  
      // velocity
      this.pos = this.pos.add(this.vel);
  
    };
  
    // lavalamp constructor
    var LavaLamp = function(width, height, numBalls, c0, c1) {
      this.step = 5;
      this.width = width;
      this.height = height;
      this.wh = Math.min(width, height);
      this.sx = Math.floor(this.width / this.step);
      this.sy = Math.floor(this.height / this.step);
      this.paint = false;
      this.metaFill = createRadialGradient(width, height, width, c0, c1);
      this.plx = [0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0];
      this.ply = [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1];
      this.mscases = [0, 3, 0, 3, 1, 3, 0, 3, 2, 2, 0, 2, 1, 1, 0];
      this.ix = [1, 0, -1, 0, 0, 1, 0, -1, -1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1];
      this.grid = [];
      this.balls = [];
      this.iter = 0;
      this.sign = 1;
  
      // init grid
      for (var i = 0; i < (this.sx + 2) * (this.sy + 2); i++) {
        this.grid[i] = new Point(
          (i % (this.sx + 2)) * this.step, (Math.floor(i / (this.sx + 2))) * this.step
        )
      }
  
      // create metaballs
      for (var k = 0; k < numBalls; k++) {
        this.balls[k] = new Ball(this);
      }
    };
    // compute cell force
    LavaLamp.prototype.computeForce = function(x, y, idx) {
  
      var force;
      var id = idx || x + y * (this.sx + 2);
  
      if (x === 0 || y === 0 || x === this.sx || y === this.sy) {
        force = 0.6 * this.sign;
      } else {
        force = 0;
        var cell = this.grid[id];
        var i = 0;
        var ball;
        while (ball = this.balls[i++]) {
          force += ball.size * ball.size / (-2 * cell.x * ball.pos.x - 2 * cell.y * ball.pos.y + ball.pos.magnitude + cell.magnitude);
        }
        force *= this.sign
      }
      this.grid[id].force = force;
      return force;
    };
    // compute cell
    LavaLamp.prototype.marchingSquares = function(next) {
      var x = next[0];
      var y = next[1];
      var pdir = next[2];
      var id = x + y * (this.sx + 2);
      if (this.grid[id].computed === this.iter) {
        return false;
      }
      var dir, mscase = 0;
  
      // neighbors force
      for (var i = 0; i < 4; i++) {
        var idn = (x + this.ix[i + 12]) + (y + this.ix[i + 16]) * (this.sx + 2);
        var force = this.grid[idn].force;
        if ((force > 0 && this.sign < 0) || (force < 0 && this.sign > 0) || !force) {
          // compute force if not in buffer
          force = this.computeForce(
            x + this.ix[i + 12],
            y + this.ix[i + 16],
            idn
          );
        }
        if (Math.abs(force) > 1) mscase += Math.pow(2, i);
      }
      if (mscase === 15) {
        // inside
        return [x, y - 1, false];
      } else {
        // ambiguous cases
        if (mscase === 5) dir = (pdir === 2) ? 3 : 1;
        else if (mscase === 10) dir = (pdir === 3) ? 0 : 2;
        else {
          // lookup
          dir = this.mscases[mscase];
          this.grid[id].computed = this.iter;
        }
        // draw line
        var ix = this.step / (
            Math.abs(Math.abs(this.grid[(x + this.plx[4 * dir + 2]) + (y + this.ply[4 * dir + 2]) * (this.sx + 2)].force) - 1) /
            Math.abs(Math.abs(this.grid[(x + this.plx[4 * dir + 3]) + (y + this.ply[4 * dir + 3]) * (this.sx + 2)].force) - 1) + 1
          );
        ctx.lineTo(
          this.grid[(x + this.plx[4 * dir]) + (y + this.ply[4 * dir]) * (this.sx + 2)].x + this.ix[dir] * ix,
          this.grid[(x + this.plx[4 * dir + 1]) + (y + this.ply[4 * dir + 1]) * (this.sx + 2)].y + this.ix[dir + 4] * ix
        );
        this.paint = true;
        // next
        return [
          x + this.ix[dir + 4],
          y + this.ix[dir + 8],
          dir
        ];
      }
    };
  
    LavaLamp.prototype.renderMetaballs = function() {
      var i = 0, ball;
      while (ball = this.balls[i++]) ball.move();
      // reset grid
      this.iter++;
      this.sign = -this.sign;
      this.paint = false;
      ctx.fillStyle = this.metaFill;
      ctx.beginPath();
      
      // Set shadow properties
      ctx.shadowBlur = 300;
      ctx.shadowColor = "#ff6b89"; // Adjust the shadow color and opacity
      
      // compute metaballs
      i = 0;
      while (ball = this.balls[i++]) {
        // first cell
        var next = [
          Math.round(ball.pos.x / this.step),
          Math.round(ball.pos.y / this.step), false
        ];
        // marching squares
        do {
          next = this.marchingSquares(next);
        } while (next);
        // fill and close path
        if (this.paint) {
          ctx.fill();
          ctx.closePath();
          ctx.beginPath();
          this.paint = false;
        }
      }
      
      // Reset shadow properties
      ctx.shadowBlur = 0.5;
      ctx.shadowColor = "transparent";
    };
    
  
    // gradients
    var createRadialGradient = function(w, h, r, c0, c1) {
      var gradient = ctx.createRadialGradient(
        w / 1, h / 1, 0,
        w / 1, h / 1, r
      );
      gradient.addColorStop(0, c0);
      gradient.addColorStop(1, c1);
      return gradient;
    };
  
    // main loop
    var run = function() {
      requestAnimationFrame(run);
      ctx.clearRect(0, 0, screen.width, screen.height);
      lava0.renderMetaballs();
    };
    // canvas
    var screen = ge1doot.screen.init("bubble", null, true),
        ctx = screen.ctx;
    screen.resize();
    // create LavaLamps
    lava0 = new LavaLamp(screen.width, screen.height, 6, "#ff6b89", "#ff0033"); 
  
    run();
  
  //-------------------------------------------------------------------------------------------------------//
  
  //--------------------------------------Change section---------------------------------------------------//
  
  document.addEventListener("DOMContentLoaded", function () {
    var colorButton = document.getElementById('colorButton');
  
    // Function to generate a random color
    function getRandomColor() {
      var letters = '0123456789ABCDEF';
      var color = '#';
      for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    }
    
    // Function to change the lava lamp color
    function changeColors() {
      // Change the lava lamp color
      lava0.metaFill = createRadialGradient(screen.width, screen.height, screen.width, getRandomColor(), getRandomColor());

      // Change the background color of the whole website
      document.body.style.backgroundColor = getRandomColor();
    }

    // Add click event listener to the color button
    colorButton.addEventListener('click', changeColors);


    
  
    // Function to change the lava lamp color
    function changeLavaLampColor() {
      var newColor0 = getRandomColor();
      var newColor1 = getRandomColor();
      lava0.metaFill = createRadialGradient(screen.width, screen.height, screen.width, newColor0, newColor1);
    }
  
    // Event listener for the button click
    colorButton.addEventListener('click', function () {
      changeLavaLampColor();
    });
  });
  
  document.addEventListener("DOMContentLoaded", function () {
    var headerLinks = document.querySelectorAll('.nav-link');
    var portfolioSections = document.querySelectorAll('.portfolio-section');
    var overlay = document.querySelector('.overlay');
  
    var isAlternativeView = false;
  
    headerLinks.forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            var targetId = this.getAttribute('href').substring(1);
  
            headerLinks.forEach(function (link) {
                link.classList.remove('active');
            });
            this.classList.add('active');
  
            portfolioSections.forEach(function (section) {
                section.classList.remove('active', 'fade-in', 'fade-out');
            });
  
            var targetSection = document.getElementById(targetId);
            document.body.classList.add('fade-out');
  
            // Triggering the fade-out animation with screen darkening
            overlay.classList.add('darken');
  
            setTimeout(function () {
                portfolioSections.forEach(function (section) {
                    section.classList.remove('fade-in', 'fade-out');
                });
  
                targetSection.classList.add('active', 'fade-in');
  
                // Check if it's the alternative view
                if (isAlternativeView) {
                    // Move contents to the top
                    document.body.classList.add('alternative-view');
                    setTimeout(function () {
                        // Remove alternative view styles after animation
                        document.body.classList.remove('alternative-view');
                    }, 500); // Adjust the duration as needed
                }
  
                document.body.classList.remove('fade-out');
                overlay.classList.remove('darken');
            }, 500); // 500 milliseconds, adjust as needed
        });
    });
  });
  
  //-------------------------------------------------------------------------------------------------------//
  
  /*----------------------------------content box creation on link hover-----------------------------------
  
  
  
  // Function to create and show content box
  var showContentBox = function (content) {
    var box = document.createElement("div");
    box.className = "content-box";
    box.innerHTML = content;
  
    // Flag to track whether the cursor is over the box
    var isHovered = false;
  
    // Position the box in the middle of the screen
    var centerX = screen.width / 2 - box.offsetWidth / 2;
    var centerY = screen.height / 2 - box.offsetHeight / 2;
  
    box.style.left = centerX + "px";
    box.style.top = centerY + "px";
  
    document.body.appendChild(box);
  
    // Function to handle cursor entering the box
    var handleMouseEnter = function () {
      isHovered = true;
      // Remove transition for instant opacity change
      box.style.transition = "none";
      box.style.opacity = 1;
    };
  
    // Function to handle cursor leaving the box
    var handleMouseLeave = function () {
      isHovered = false;
      // Restore transition for smooth fade-out
      box.style.transition = "opacity 0.5s";
      box.style.opacity = 0;
  
      // Remove the box from the DOM after the transition ends
      box.addEventListener('transitionend', function () {
        if (!isHovered) {
          document.body.removeChild(box);
        }
      });
    };
  
    // Add event listeners for mouse enter and leave
    box.addEventListener('mouseenter', handleMouseEnter);
    box.addEventListener('mouseleave', handleMouseLeave);
  };
  
  // Add event listeners to links
  var links = document.querySelectorAll('.category');
  links.forEach(function (link) {
    link.addEventListener('mouseover', function () {
      // Show content box with link text
      showContentBox(link.textContent);
    });
  });
  
  
  -------------------------------------------------------------------------------------------------------*/

})();
  
