import * as THREE from '../../libs/three/three.module.js';
import {
    VRButton
} from '../../libs/three/jsm/VRButton.js';
import {
    XRControllerModelFactory
} from '../../libs/three/jsm/XRControllerModelFactory.js';
import {
    BoxLineGeometry
} from '../../libs/three/jsm/BoxLineGeometry.js';
import {
    Stats
} from '../../libs/stats.module.js';
import {
    OrbitControls
} from '../../libs/three/jsm/OrbitControls.js';
import {
    LoadingBar
} from '../../libs/LoadingBar.js';
import {
    GLTFLoader
} from '../../libs/three/jsm/GLTFLoader.js';
import {
    FBXLoader
} from '../../libs/three/jsm/FBXLoader.js';


class App {
    constructor() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        this.clock = new THREE.Clock();

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 3);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x505050);

        this.scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        container.appendChild(this.renderer.domElement);

        //Add code here
        let testmodel = '';
        let posx = 0;
        let posy = 0;
        let posz = 0;

        this.loadingBar = new LoadingBar();
        
        testmodel = 'redroom.glb';
        this.loadGLTF(testmodel, posx, posy, posz);
        
        testmodel = 'egg.glb';
        posx = -3.5;
        posy = 0;
        posz = -25;

        this.loadGLTF(testmodel, posx, posy, posz);


        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1.6, 0);
        this.controls.update();

        this.stats = new Stats();
        container.appendChild(this.stats.dom);

        ////////////////////////////////////////////////////////////
        ////////////// Maybe part of building controller? //////////
        ////////////////////////////////////////////////////////////

        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();
        this.workingVector = new THREE.Vector3();
        this.origin = new THREE.Vector3();

        ////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////

        this.initScene();
        this.setupXR();

        window.addEventListener('resize', this.resize.bind(this));

        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    ////////////////////////////////////////////////////////////
    ////////////// Load GLTF ///////////////////////////////////
    ////////////////////////////////////////////////////////////

    loadGLTF(testmodel, posx, posy, posz) {
        const self = this;
        const loader = new GLTFLoader().setPath('../../assets/');

        loader.load(
            testmodel,
            function (gltf) {
                self.chair = gltf.scene;

                gltf.scene.position.x = posx;
                gltf.scene.position.y = posy;
                gltf.scene.position.z = posz;

                self.scene.add(gltf.scene);
                self.loadingBar.visible = false;
                self.renderer.setAnimationLoop(self.render.bind(self));
            },
            function (xhr) {
                self.loadingBar.progress = xhr.loaded / xhr.total;
            },
            function (err) {
                console.log('an error happened');
            }
        )
    }

    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////


    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    initScene() {
        this.plane = {};
        this.mats = [];

        this.video = document.getElementById('video');
        // this.video.play();
        this.texture = new THREE.VideoTexture(this.video);
        this.plane.mesh = new THREE.Mesh(
            new THREE.CircleGeometry(6.5, 64),
            new THREE.MeshPhongMaterial({
                color: 0xaaaaaa,
                map: this.texture
            })
        );

        this.plane.mesh.position.x = -3.5;
        this.plane.mesh.position.y = 12.25;
        this.plane.mesh.position.z = -50;
        this.plane.mesh.receiveShadow = true;
        this.scene.add(this.plane.mesh);

    }

    setupXR() {
        this.renderer.xr.enabled = true;
        document.body.appendChild(VRButton.createButton(this.renderer));


        //////////////////////////////////////////////////
        ///////////// Build and Add Controller ///////////
        //////////////////////////////////////////////////
        const self = this;

        function onSelectStart() {

            this.userData.selectPressed = true;
            console.log("test");
        }

        function onSelectEnd() {

            this.userData.selectPressed = false;

        }

        this.controller = this.renderer.xr.getController(0);
        this.controller.addEventListener('selectstart', onSelectStart);
        this.controller.addEventListener('selectend', onSelectEnd);
        this.controller.addEventListener('connected', function (event) {

            const mesh = self.buildController.call(self, event.data);
            mesh.scale.z = 0;
            this.add(mesh);

        });
        this.controller.addEventListener('disconnected', function () {

            this.remove(this.children[0]);
            self.controller = null;
            self.controllerGrip = null;

        });
        this.scene.add(this.controller);

        const controllerModelFactory = new XRControllerModelFactory();

        this.controllerGrip = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip.add(controllerModelFactory.createControllerModel(this.controllerGrip));
        this.scene.add(this.controllerGrip);
        //////////////////////////////////////////////////
        //////////////////////////////////////////////////
        //////////////////////////////////////////////////

        //////////////////////////////////////////////////
        ///////////////////Adding Movement ///////////////
        //////////////////////////////////////////////////

        this.dolly = new THREE.Object3D();
        this.dolly.position.z = -2;
        this.dolly.add(this.camera);
        this.scene.add(this.dolly);

        this.dummyCam = new THREE.Object3D();
        this.camera.add(this.dummyCam);

        //////////////////////////////////////////////////
        //////////////////////////////////////////////////
        //////////////////////////////////////////////////
    }

    buildController(data) {
        let geometry, material;

        switch (data.targetRayMode) {

            case 'tracked-pointer':

                geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

                material = new THREE.LineBasicMaterial({
                    vertexColors: true,
                    blending: THREE.AdditiveBlending
                });

                return new THREE.Line(geometry, material);

            case 'gaze':

                geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(0, 0, -1);
                material = new THREE.MeshBasicMaterial({
                    opacity: 0.5,
                    transparent: true
                });
                return new THREE.Mesh(geometry, material);

        }

    }

    handleController(controller, dt) {
        if (controller.userData.selectPressed) {

            const wallLimit = 1.3;
            const speed = 2;
            let pos = this.dolly.position.clone();
            pos.y += 1;

            let dir = new THREE.Vector3();
            //Store original dolly rotation
            const quaternion = this.dolly.quaternion.clone();
            //Get rotation for movement from the headset pose
            this.dolly.quaternion.copy(this.dummyCam.getWorldQuaternion());
            this.dolly.getWorldDirection(dir);
            dir.negate();
            this.raycaster.set(pos, dir);

            let blocked = false;

            let intersect = this.raycaster.intersectObjects(this.colliders);
            if (intersect.length > 0) {
                if (intersect[0].distance < wallLimit) blocked = true;
            }

            if (!blocked) {
                this.dolly.translateZ(-dt * speed);
                pos = this.dolly.getWorldPosition(this.origin);
            }

            //cast left
            dir.set(-1, 0, 0);
            dir.applyMatrix4(this.dolly.matrix);
            dir.normalize();
            this.raycaster.set(pos, dir);

            intersect = this.raycaster.intersectObjects(this.colliders);
            if (intersect.length > 0) {
                if (intersect[0].distance < wallLimit) this.dolly.translateX(wallLimit - intersect[0].distance);
            }

            //cast right
            dir.set(1, 0, 0);
            dir.applyMatrix4(this.dolly.matrix);
            dir.normalize();
            this.raycaster.set(pos, dir);

            intersect = this.raycaster.intersectObjects(this.colliders);
            if (intersect.length > 0) {
                if (intersect[0].distance < wallLimit) this.dolly.translateX(intersect[0].distance - wallLimit);
            }

            this.dolly.position.y = 0;

            //Restore the original rotation
            this.dolly.quaternion.copy(quaternion);

        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        const dt = this.clock.getDelta();

        this.video.play();

        this.stats.update();
        if (this.controller) this.handleController(this.controller, dt);
        this.renderer.render(this.scene, this.camera);
    }
}

export {
    App
};