import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
import {EffectComposer} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/postprocessing/ShaderPass.js';
import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/GLTFLoader.js';

// import * as THREE from './three.js-master/build/three.module.js';
// import {EffectComposer} from './three.js-master/examples/jsm/postprocessing/EffectComposer.js';
// import {RenderPass} from './three.js-master/examples/jsm/postprocessing/RenderPass.js';
// import {UnrealBloomPass} from './three.js-master/examples/jsm/postprocessing/UnrealBloomPass.js';
// import { ShaderPass } from './three.js-master/examples/jsm/postprocessing/ShaderPass.js';
// import {OrbitControls} from './three.js-master/examples/jsm/controls/OrbitControls.js';
// import {GLTFLoader} from './three.js-master/examples/jsm/loaders/GLTFLoader.js';

const BASE_LAYER = 0;
const GLOW_LAYER = 1;

const glowLayer = new THREE.Layers();
glowLayer.set( GLOW_LAYER );

const darkMaterial = new THREE.MeshBasicMaterial( { color: "black" } );

const loader = new GLTFLoader();
const skyboxLoader = new THREE.CubeTextureLoader();

class SceneNode extends HTMLElement {
    constructor() {
        super();
        this.root = null;
        this.world = null;
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if(this.root !== null) {
            switch(name) {
                case 'position':
                    let newPos = newValue.split(' ');
                    if(!isNaN(+newPos[0]) || !isNaN(+newPos[1] || !isNaN(+newPos[2]))) {
                        this.root.position.set(+newPos[0], +newPos[1], +newPos[2]);
                    }
                    break;
                    
                    case 'rotation':
                        let newRot = newValue.split(' ');
                        if(!isNaN(+newRot[0]) || !isNaN(+newRot[1] || !isNaN(+newRot[2]))) {
                            this.root.rotation.set(+newRot[0], +newRot[1], +newRot[2]);
                        }
                        break;
                
                case 'scale':
                    let newScl = newValue.split(' ');
                    if(!isNaN(+newScl[0]) || !isNaN(+newScl[1] || !isNaN(+newScl[2]))) {
                        this.root.scale.set(+newScl[0], +newScl[1], +newScl[2]);
                    }
                    break;
                }
            }
        }
        
        static get observedAttributes() {return ['position', 'rotation', 'scale'];}
        
        add(elem) {
            this.root.add(elem);
            return this.world;
        }
        
        remove(elem) {
            this.root.remove(elem);
        }
}

class Test extends SceneNode {
    constructor() {
        super();
        this.message = 'OK';
    }
    
    connectedCallback() {
        this.showMessage();
    }

    showMessage() {
        console.log(this.message);
    }
}

customElements.define("three-test", Test);

class World extends SceneNode {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        this.materials = {};
        this.background = null;
    }
    
    connectedCallback() {
        //GLOBAL CLOCK FOR ALL CHILDREN
        this.clock = new THREE.Clock();

        //SCENE
        this.root = new THREE.Scene();
        
        //CAMERA
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 1000);
        this.camera.position.set( 200, 50, 0 );
        
        //RENDERER
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePicelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.gammaFactor = 2.2;
        this.renderer.autoClear = false;
        window.addEventListener( 'resize', this.windowResize.bind(this), false );
        this.shadow.appendChild(this.renderer.domElement);
        
        //POST-PROCESSING COMPOSER FOR GLOWING ELEMENTS
        this.renderPass = new RenderPass(this.root, this.camera);
        
        this.bloomPass = new UnrealBloomPass( new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85 );
        this.bloomPass.threshold = 0;
        this.bloomPass.strength = 3;
        this.bloomPass.radius = 0;
        
        this.bloomComposer = new EffectComposer(this.renderer);
        this.bloomComposer.renderToScreen = false;
        this.bloomComposer.addPass(this.renderPass);
        this.bloomComposer.addPass(this.bloomPass);
        
        this.finalPass = new ShaderPass(
            new THREE.ShaderMaterial( {
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
                },
                vertexShader: document.getElementById( 'vertexshader' ).textContent,
                fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
                defines: {}
            } ), "baseTexture"
        );
        this.finalPass.needsSwap = true;
        
        this.finalComposer = new EffectComposer(this.renderer);
        this.finalComposer.addPass(this.renderPass);
        this.finalComposer.addPass(this.finalPass);

        // CONTROLS

        this.controls = new OrbitControls( this.camera, this.renderer.domElement );

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 200;
        this.controls.maxDistance = 1000;
        this.controls.maxPolarAngle = Math.PI / 2;

        this.animate();
    }

    windowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    };

    animate() {
        requestAnimationFrame( this.animate.bind(this) );
        this.controls.update();
        this.render()
    }
    
    render() {
        this.root.traverse( this.darkenNonBloomed.bind(this) );
        this.root.background = null;
        this.bloomComposer.render();
        this.root.traverse( this.restoreMaterial.bind(this) );
        this.root.background = this.background;
        this.finalComposer.render();
    }

    darkenNonBloomed(obj) {
        if ( obj.isMesh && glowLayer.test( obj.layers ) === false ) {
            this.materials[ obj.uuid ] = obj.material;
            obj.material = darkMaterial;
        }
    }

    restoreMaterial(obj) {
        if ( this.materials[ obj.uuid ] ) {
            obj.material = this.materials[ obj.uuid ];
            delete this.materials[ obj.uuid ];
        }
    }

    setBackground(cubemap) {
        this.background = cubemap;
    }

    add(elem) {
        super.add(elem);
        return this;
    }
}

customElements.define("intro-world", World);

class Sun extends SceneNode {
    constructor() {
        super();
    }

    connectedCallback() {
        this.radius = this.hasAttribute('radius') ? +this.getAttribute('radius') : 20;
        this.sphere = new THREE.IcosahedronGeometry(this.radius, 1);
        this.material = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
        
        this.root = new THREE.Mesh(this.sphere, this.material);
        this.root.layers.toggle(GLOW_LAYER);

        this.world = this.parentNode.add(this.root);
    }
}

customElements.define("intro-sun", Sun);

class GLTFmodel extends SceneNode {
    constructor() {
        super();
    }

    connectedCallback() {
        let posAttr = this.hasAttribute('position') ? this.getAttribute('position') : '0 0 0';
        this.position = [ +posAttr.split(' ')[0], +posAttr.split(' ')[1], +posAttr.split(' ')[2] ];
        if (this.hasAttribute('src')) {
            let loadingModel = new Promise((resolve, reject) => {
                loader.load(this.getAttribute('src'),
                    
                    function( gltf ) {
                        gltf.scene.traverse(function(obj) {
                            if(obj.type === "Mesh") {
                                obj.castShadow = true;
                                // obj.material = new THREE.MeshBasicMaterial({color: 0xFF0000});
                            }
                        });
                        this.root = gltf.scene;
                        this.root.position.set(this.position[0], this.position[1], this.position[2]);
                        this.world = this.parentNode.add(this.root);
                        this.modelLoaded();
                
                    }.bind(this),
                    
                    function( xhr ) {
                        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
                    },
                    
                    function( error ) {
                        reject('error while loading : ' + this.getAttribute('src'));
                    }
                );
            });
        }
    }

    modelLoaded() {
        // this.root.onBeforeRender = function() {console.log('running');}; //example
        return; //override in childrens
    }
}

customElements.define("intro-gltf", GLTFmodel);

class Planet extends GLTFmodel {
    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
        this.orbitRadius = this.hasAttribute('orbit-radius') ? +this.getAttribute('orbit-radius') : 404;
        this.speed = this.hasAttribute('speed') ? +this.getAttribute('speed') : 20;
        this.offset = this.hasAttribute('offset') ? +this.getAttribute('offset') : 0;
        this.progresssion = this.offset;
        this.movefct = this.hasAttribute('movefct') ? this.getAttribute('movefct') + '()' : null;
        console.log(this.movefct);
        eval(this.movefct);
    }
    
    update() {
        this.progresssion = (this.world.clock.getElapsedTime() + this.offset) % this.speed;
        let angle = (this.progresssion / this.speed) * 2*Math.PI; //convert the progression in radians
        let X = Math.cos(angle) * this.orbitRadius;
        let Y = Math.sin(angle) * this.orbitRadius;
        this.root.position.set(X, 0, Y);
    }
    
    modelLoaded() {
        this.root.position.set(0, 0, 0);
        this.root.children[0].onBeforeRender = this.update.bind(this);
    }
}

customElements.define('intro-planet', Planet);

class SkyBox extends HTMLElement {
    constructor() {
        super();
        this.cubemap = null;
    }

    connectedCallback() {
        if(this.hasAttribute('front') && this.hasAttribute('back') &&
            this.hasAttribute('right') && this.hasAttribute('left') &&
            this.hasAttribute('top') && this.hasAttribute('down')) {

                this.cubemap = skyboxLoader.load([
                    this.getAttribute('front'),
                    this.getAttribute('back'),
                    this.getAttribute('top'),
                    this.getAttribute('down'),
                    this.getAttribute('right'),
                    this.getAttribute('left'),
                ]);
                this.cubemap.encoding = THREE.sRGBEncoding;
                this.parentNode.setBackground(this.cubemap);
        }
    }
}

customElements.define('intro-skybox', SkyBox);

class Light extends SceneNode {
    constructor() {
        super();
        this.color = this.hasAttribute('color') ? +this.getAttribute('color') : 0xFFFFFF;
        this.color = isNaN(this.color) ? 0xFFFFFF : this.color;
        this.intensity = this.hasAttribute('instensity') ? +this.getAttribute('intensity') : 1;
        this.intensity = isNaN(this.intensity) ? 1 : this.intensity;
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if(this.root !== null) {
            switch(name) {
                case 'color':
                    this.color = isNaN(+newValue) ? this.color : +newValue;
                    console.log('color changed to ' + this.color);
                    this.root.color.set(this.color);
                    break;
                    
                case 'intensity':
                    this.intensity = isNaN(+newValue) ? this.intensity : +newValue;
                    console.log('intentsity changed to ' + this.intensity);
                    this.root.intensity = this.intensity;
                    break;
            }
        }
    }

    static get observedAttributes() {return ['position', 'rotation', 'scale', 'color', 'intensity'];}
}

customElements.define('test-light', Light);

class AmbientLight extends Light {
    constructor() {
        super();
    }
    
    connectedCallback() {
        this.root = new THREE.AmbientLight(this.color, this.intensity);
        this.world = this.parentNode.add(this.root);
    }
}

customElements.define('light-ambient', AmbientLight);

class PointLight extends Light {
    constructor() {
        super();
        this.distance = this.hasAttribute('distance') ? +this.getAttribute('distance') : 0;
        this.distance = isNaN(this.distance) ? 0 : this.distance;
        this.decay = this.hasAttribute('decay') ? +this.getAttribute('decay') : 1;
        this.decay = isNaN(this.decay) ? 1 : this.decay;
    }

    connectedCallback() {
        this.root = new THREE.PointLight(this.color, this.intensity, this.distance, this.decay);
        this.world = this.parentNode.add(this.root);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if(this.root !== null) {
            switch(name) {
                case 'distance':
                    this.distance = isNaN(+newValue) ? this.distance : +newValue;
                    console.log('distance changed to ' + this.distance);
                    this.root.distance = this.distance;
                    break;
                    
                case 'decay':
                    this.decay = isNaN(+newValue) ? this.decay : +newValue;
                    console.log('decay changed to ' + this.decay);
                    this.root.decay = this.decay;
                    break;
            }
        }
    }

    static get observedAttributes() {return ['position', 'rotation', 'scale', 'color', 'intensity', 'distance', 'decay'];}
}

customElements.define('light-point', PointLight);