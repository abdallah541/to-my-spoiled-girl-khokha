import * as THREE from "https://cdn.skypack.dev/three@0.135.0";
import { gsap } from "https://cdn.skypack.dev/gsap@3.8.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.135.0/examples/jsm/loaders/GLTFLoader";

class World {
  constructor({
    canvas,
    width,
    height,
    cameraPosition,
    fieldOfView = 75,
    nearPlane = 0.1,
    farPlane = 100
  }) {
    this.parameters = {
      count: 1500,
      max: 12.5 * Math.PI,
      a: 2,
      c: 4.5
    };

    this.textureLoader = new THREE.TextureLoader();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x16000a);
    this.clock = new THREE.Clock();
    this.data = 0;
    this.time = { current: 0, t0: 0, t1: 0, t: 0, frequency: 0.0005, delta: 0, elapsed: 0 };
    this.angle = { x: 0, z: 0 };
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    this.aspectRatio = this.width / this.height;
    this.fieldOfView = fieldOfView;
    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      this.aspectRatio,
      nearPlane,
      farPlane
    );

    // ضبط المسافة الأساسية للكاميرا لتناسب شاشات الموبايل الطولية
    this.baseZ = this.aspectRatio < 1 ? 6.2 : cameraPosition.z;
    this.parameters.c = this.baseZ;

    this.camera.position.set(
      cameraPosition.x,
      cameraPosition.y,
      this.baseZ
    );

    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance"
    });

    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.timer = 0;
    this.isRunning = false;
    this.messageEl = document.getElementById("message-text");

    this.addToScene();
    this.addButton();

    this.render();
    this.listenToResize();
    this.listenToPointerMove();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.composer && this.composer.render();
  }

  playTextSequence() {
    if (this.textTimeline) {
      this.textTimeline.kill();
    }

    const messages = ["I am sorry...", "Forgive me", "I love you ❤️"];
    this.textTimeline = gsap.timeline();

  
    this.textTimeline.to(this.messageEl, {
      opacity: 0,
      y: -15,
      scale: 0.9,
      duration: 0.8,
      ease: "power2.in"
    });

    messages.forEach((msg, index) => {
      this.textTimeline.call(() => {
        this.messageEl.textContent = msg;
      });

      // ظهور الكلمة بتأثير نبض هادئ
      this.textTimeline.fromTo(
        this.messageEl,
        { opacity: 0, y: 20, scale: 0.85, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.4,
          ease: "back.out(1.7)"
        }
      );

      // إبقاء الكلمة الأخيرة (I love you) ظاهرة على الشاشة، وإخفاء ما قبلها للتبديل
      if (index < messages.length - 1) {
        this.textTimeline.to(this.messageEl, {
          opacity: 0,
          y: -20,
          scale: 1.08,
          filter: "blur(6px)",
          duration: 1,
          delay: 2.2,
          ease: "power2.in"
        });
      } else {
        // نبض خفيف ومستمر لكلمة I love you
        this.textTimeline.to(this.messageEl, {
          scale: 1.08,
          duration: 0.9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }
    });
  }

  loop() {
    this.time.elapsed = this.clock.getElapsedTime();
    this.time.delta = Math.min(
      60,
      Math.max(0, (this.time.elapsed - this.time.current) * 1000)
    );

    if (this.analyser && this.isRunning) {
      this.time.t = this.time.elapsed - this.time.t0 + this.time.t1;
      this.data = this.analyser.getAverageFrequency();
      this.data *= this.data / 2000;
      this.angle.x += this.time.delta * 0.001 * 0.63;
      this.angle.z += this.time.delta * 0.001 * 0.39;

      const justFinished = this.isRunning && !this.sound.isPlaying;
      if (justFinished) {
        this.time.t1 = this.time.t;
        this.audioBtn.disabled = false;
        this.isRunning = false;
        const tl = gsap.timeline();
        this.angle.x = 0;
        this.angle.z = 0;
        tl.to(this.camera.position, {
          x: 0,
          z: this.baseZ,
          duration: 4,
          ease: "expo.in"
        });
        tl.to(this.audioBtn, {
          opacity: () => 1,
          duration: 1,
          ease: "power1.out"
        });
      } else {
        this.camera.position.x = Math.sin(this.angle.x) * this.parameters.a;
        this.camera.position.z = Math.min(
          Math.max(Math.cos(this.angle.z) * this.parameters.c, 2.2),
          7.5
        );
      }
    }

    this.camera.lookAt(this.scene.position);

    if (this.heartMaterial) {
      this.heartMaterial.uniforms.uTime.value +=
        this.time.delta * this.time.frequency * (1 + this.data * 0.2);
    }
    if (this.model) {
      this.model.rotation.y -= 0.0005 * this.time.delta * (1 + this.data);
    }
    if (this.snowMaterial) {
      this.snowMaterial.uniforms.uTime.value +=
        this.time.delta * 0.0004 * (1 + this.data);
    }

    this.render();

    this.time.current = this.time.elapsed;
    requestAnimationFrame(this.loop.bind(this));
  }

  listenToResize() {
    window.addEventListener("resize", () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.aspectRatio = this.width / this.height;
      this.baseZ = this.aspectRatio < 1 ? 6.2 : 4.5;
      this.parameters.c = this.baseZ;

      this.camera.aspect = this.aspectRatio;
      this.camera.updateProjectionMatrix();
      if (!this.isRunning) {
        this.camera.position.z = this.baseZ;
      }
      this.renderer.setSize(this.width, this.height);
    });
  }

  listenToPointerMove() {
    const handleMove = (clientX, clientY) => {
      if (this.isRunning) return;
      gsap.to(this.camera.position, {
        x: gsap.utils.mapRange(0, window.innerWidth, 0.25, -0.25, clientX),
        y: gsap.utils.mapRange(0, window.innerHeight, 0.25, -0.25, -clientY),
        overwrite: "auto"
      });
    };

    // دعم الماوس للكمبيوتر
    window.addEventListener("mousemove", e => {
      handleMove(e.clientX, e.clientY);
    });

    // دعم اللمس للموبايل
    window.addEventListener(
      "touchmove",
      e => {
        if (e.touches.length > 0) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );
  }

  addHeart() {
    this.heartMaterial = new THREE.ShaderMaterial({
      fragmentShader: document.getElementById("fragmentShader").textContent,
      vertexShader: document.getElementById("vertexShader").textContent,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.2 }
      },
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const count = this.parameters.count;
    const scales = new Float32Array(count * 1);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const randoms = new Float32Array(count);
    const randoms1 = new Float32Array(count);
    const colorChoices = [
      "white",
      "red",
      "pink",
      "crimson",
      "hotpink",
      "green"
    ];

    const squareGeometry = new THREE.PlaneGeometry(1, 1);
    this.heartGeometry = new THREE.InstancedBufferGeometry();
    Object.keys(squareGeometry.attributes).forEach(attr => {
      this.heartGeometry.attributes[attr] = squareGeometry.attributes[attr];
    });
    this.heartGeometry.index = squareGeometry.index;
    this.heartGeometry.maxInstancedCount = count;

    for (let i = 0; i < count; i++) {
      const i3 = 3 * i;
      randoms[i] = Math.random();
      randoms1[i] = Math.random();
      scales[i] = Math.random() * 0.35;
      const colorIndex = Math.floor(Math.random() * colorChoices.length);
      const color = new THREE.Color(colorChoices[colorIndex]);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      speeds[i] = Math.random() * this.parameters.max;
    }

    this.heartGeometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randoms, 1, false)
    );
    this.heartGeometry.setAttribute(
      "random1",
      new THREE.InstancedBufferAttribute(randoms1, 1, false)
    );
    this.heartGeometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1, false)
    );
    this.heartGeometry.setAttribute(
      "aSpeed",
      new THREE.InstancedBufferAttribute(speeds, 1, false)
    );
    this.heartGeometry.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(colors, 3, false)
    );

    this.heart = new THREE.Mesh(this.heartGeometry, this.heartMaterial);
    this.scene.add(this.heart);
  }

  addToScene() {
    this.addModel();
    this.addHeart();
    this.addSnow();
  }

  async addModel() {
    try {
      this.model = await this.loadObj(
        "https://assets.codepen.io/74321/heart.glb"
      );
      this.model.scale.set(0.01, 0.01, 0.01);
      this.model.material = new THREE.MeshMatcapMaterial({
        matcap: this.textureLoader.load(
          "https://assets.codepen.io/74321/3.png",
          () => {
            gsap.to(this.model.scale, {
              x: 0.35,
              y: 0.35,
              z: 0.35,
              duration: 1.5,
              ease: "Elastic.easeOut"
            });
          }
        ),
        color: "#ff89aC"
      });
      this.scene.add(this.model);
    } catch (error) {
      console.error("Failed to load heart model:", error);
    }
  }

  addButton() {
    this.audioBtn = document.querySelector("button");
    this.audioBtn.addEventListener("click", () => {
      this.audioBtn.disabled = true;
      if (this.analyser) {
        if (this.sound.context.state === "suspended") {
          this.sound.context.resume();
        }
        this.sound.play();
        this.time.t0 = this.time.elapsed;
        this.data = 0;
        this.isRunning = true;
        this.playTextSequence();
        gsap.to(this.audioBtn, {
          opacity: 0,
          duration: 1,
          ease: "power1.out"
        });
      } else {
        // بدء عرض الرسائل فوراً حتى أثناء تحميل الصوت على الموبايل
        this.playTextSequence();
        this.loadMusic().then(() => {
          console.log("music loaded");
        });
      }
    });
  }

  loadObj(path) {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        response => {
          resolve(response.scene.children[0]);
        },
        () => {},
        err => {
          reject(err);
        }
      );
    });
  }

  loadMusic() {
    return new Promise((resolve, reject) => {
      const listener = new THREE.AudioListener();
      this.camera.add(listener);
      this.sound = new THREE.Audio(listener);
      if (listener.context.state === "suspended") {
        listener.context.resume();
      }
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load(
        "https://assets.codepen.io/74321/ukulele.mp3",
        buffer => {
          this.sound.setBuffer(buffer);
          this.sound.setLoop(false);
          this.sound.setVolume(0.5);
          this.sound.play();
          this.analyser = new THREE.AudioAnalyser(this.sound, 32);
          const data = this.analyser.getAverageFrequency();
          this.isRunning = true;
          this.time.t0 = this.time.elapsed;
          gsap.to(this.audioBtn, {
            opacity: 0,
            duration: 1,
            ease: "power1.out"
          });
          resolve(data);
        },
        progress => {
          if (progress.total > 0) {
            gsap.to(this.audioBtn, {
              opacity: () => 1 - progress.loaded / progress.total,
              duration: 1,
              ease: "power1.out"
            });
          }
        },
        error => {
          console.error(error);
          this.audioBtn.disabled = false;
          reject(error);
        }
      );
    });
  }

  addSnow() {
    this.snowMaterial = new THREE.ShaderMaterial({
      fragmentShader: document.getElementById("fragmentShader1").textContent,
      vertexShader: document.getElementById("vertexShader1").textContent,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.3 },
        uTex: {
          value: this.textureLoader.load(
            "https://assets.codepen.io/74321/heart.png"
          )
        }
      },
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const count = 550;
    const scales = new Float32Array(count * 1);
    const colors = new Float32Array(count * 3);
    const phis = new Float32Array(count);
    const randoms = new Float32Array(count);
    const randoms1 = new Float32Array(count);
    const colorChoices = ["red", "pink", "hotpink", "green"];

    const squareGeometry = new THREE.PlaneGeometry(1, 1);
    this.snowGeometry = new THREE.InstancedBufferGeometry();
    Object.keys(squareGeometry.attributes).forEach(attr => {
      this.snowGeometry.attributes[attr] = squareGeometry.attributes[attr];
    });
    this.snowGeometry.index = squareGeometry.index;
    this.snowGeometry.maxInstancedCount = count;

    for (let i = 0; i < count; i++) {
      const phi = (Math.random() - 0.5) * 10;
      const i3 = 3 * i;
      phis[i] = phi;
      randoms[i] = Math.random();
      randoms1[i] = Math.random();
      scales[i] = Math.random() * 0.35;
      const colorIndex = Math.floor(Math.random() * colorChoices.length);
      const color = new THREE.Color(colorChoices[colorIndex]);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    this.snowGeometry.setAttribute(
      "phi",
      new THREE.InstancedBufferAttribute(phis, 1, false)
    );
    this.snowGeometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randoms, 1, false)
    );
    this.snowGeometry.setAttribute(
      "random1",
      new THREE.InstancedBufferAttribute(randoms1, 1, false)
    );
    this.snowGeometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1, false)
    );
    this.snowGeometry.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(colors, 3, false)
    );

    this.snow = new THREE.Mesh(this.snowGeometry, this.snowMaterial);
    this.scene.add(this.snow);
  }
}

const world = new World({
  canvas: document.querySelector("canvas.webgl"),
  cameraPosition: { x: 0, y: 0, z: 4.5 }
});

world.loop();