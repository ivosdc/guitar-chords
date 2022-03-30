var GuitarTuner = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    //MIT License, https://github.com/ivosdc/guitar-tuner/tree/main/src/pitchDetector.js

    const Hz = 440;
    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const A3 = 69;
    const MIN_SIGNAL = 0.005;
    const THRESHOLD = 0.25;

    function getMaxPos(correlated, SIZE) {
        let max = 0;
        while (correlated[max] > correlated[max + 1]) {
            max++;
        }

        let maxval = -1;
        let maxpos = -1;
        for (let i = max; i < SIZE; i++) {
            if (correlated[i] > maxval) {
                maxval = correlated[i];
                maxpos = i;
            }
        }
        return maxpos;
    }

    function calcBufferArray(buf) {
        let correlations = new Array(buf.length).fill(0);
        for (let i = 0; i < buf.length; i++) {
            for (let j = 0; j < buf.length - i; j++) {
                correlations[i] = correlations[i] + buf[j] * buf[j + i];
            }
        }

        return correlations;
    }

    function notEnoughSignal(buf) {
        let signal = 0;
        for (let i = 0; i < buf.length; i++) {
            signal += buf[i] * buf[i];
        }
        signal = Math.sqrt(signal / buf.length);

        return signal < MIN_SIGNAL
    }

    function getSignalStart(buf, threshold) {
        let start = 0;
        for (let i = 0; i < buf.length / 2; i++) {
            if (Math.abs(buf[i]) < threshold) {
                start = i;
                break;
            }
        }
        return start;
    }

    function getSignalEnd(buf, threshold) {
        let end = buf.length - 1;
        for (let i = 1; i < buf.length / 2; i++) {
            if (Math.abs(buf[buf.length - i]) < threshold) {
                end = buf.length - i;
                break;
            }
        }
        return end;
    }

    function getMax(buf) {
        const correlated = calcBufferArray(buf);
        let max = getMaxPos(correlated, buf.length);
        const maxA = (correlated[max - 1] + correlated[max + 1] - 2 * correlated[max]) / 2;
        const maxB = (correlated[max + 1] - correlated[max - 1]) / 2;
        if (maxA >= 0) {
            max = max - maxB / (2 * maxA);
        }
        return max;
    }

    function noteToFrequency(note) {
    	return Hz * Math.pow(2, (note - A3) / NOTES.length);
    }

    // ACF2+ algorithm
    function pitchDetection(buf, sampleRate) {
        if (notEnoughSignal(buf)) {
            return -1;
        }
        buf = buf.slice(getSignalStart(buf, THRESHOLD), getSignalEnd(buf, THRESHOLD));
    	return sampleRate / getMax(buf);
    }

    function pitchToNote(frequency) {
    	let noteNum = NOTES.length * (Math.log(frequency / Hz) / Math.log(2));
    	return Math.round(noteNum) + A3;
    }

    function detuneFromPitch(frequency, note) {
    	return Math.floor(1200 * Math.log(frequency / noteToFrequency(note)) / Math.log(2));
    }

    function getNoteString(note) {
        return NOTES[note%12]
    }

    const CHORDS = {
      empty: [{
        strings: '',
        fingering: '',
        chordName: '',
        enharmonicChordName: '',
        voicingID: '',
        tones: ''
      }],
      C: [
        {
          strings: 'X 3 2 0 1 0',
          fingering: 'X 3 2 X 1 X',
          chordName: 'C,,,',
          enharmonicChordName: 'C,,,',
          voicingID: '9223372036855826559',
          tones: 'C,E,G'
        },
        {
          strings: 'X 3 5 5 4 3',
          fingering: 'X 1 3 4 2 1',
          chordName: 'C,m,,',
          enharmonicChordName: 'C,m,,',
          voicingID: '9223372036959802495',
          tones: 'C,Eb,G'
        },
        {
          strings: 'X 3 2 3 1 0',
          fingering: 'X 3 2 4 1 X',
          chordName: 'C,,7,',
          enharmonicChordName: 'C,,7,',
          voicingID: '9223372036855924863',
          tones: 'C,E,G,Bb'
        },
        {
          strings: 'X 3 5 4 5 3',
          fingering: 'X 1 3 2 4 1',
          chordName: 'C,maj,7,',
          enharmonicChordName: 'C,maj,7,',
          voicingID: '9223372036960818303',
          tones: 'C,E,G,B'
        },
        {
          strings: 'X 3 5 3 4 3',
          fingering: 'X 1 3 1 2 1',
          chordName: 'C,m,7,',
          enharmonicChordName: 'C,m,7,',
          voicingID: '9223372036959736959',
          tones: 'C,Eb,G,Bb'
        },
        {
          strings: 'X 3 5 X X X',
          fingering: 'X 1 3 X X X',
          chordName: 'C,,5,',
          enharmonicChordName: 'C,,5,',
          voicingID: '9223372037928490111',
          tones: 'C,G'
        },
        {
          strings: 'X 3 4 2 4 X',
          fingering: 'X 2 3 1 4 X',
          chordName: 'C,dim,7,',
          enharmonicChordName: 'C,dim,7,',
          voicingID: '9223372037899227263',
          tones: 'C,Eb,Gb,A'
        },
        {
          strings: 'X 3 4 3 4 X',
          fingering: 'X 1 3 2 4 X',
          chordName: 'C,m,7b5,',
          enharmonicChordName: 'C,m,7b5,',
          voicingID: '9223372037899260031',
          tones: 'C,Eb,Gb,Bb'
        },
        {
          strings: 'X 3 X 0 5 5',
          fingering: 'X 1 X X 3 4',
          chordName: 'C,,6,',
          enharmonicChordName: 'C,,6,',
          voicingID: '9223372037027822719',
          tones: 'C,E,G,A'
        },
        {
          strings: 'X 3 5 2 4 X',
          fingering: 'X 2 4 1 3 X',
          chordName: 'C,m,6,',
          enharmonicChordName: 'C,m,6,',
          voicingID: '9223372037899228287',
          tones: 'C,Eb,G,A'
        }
      ],
      D: [
        {
          strings: 'X X 0 2 3 2',
          fingering: 'X X X 1 3 2',
          chordName: 'D,,,',
          enharmonicChordName: 'D,,,',
          voicingID: '9223372036925096959',
          tones: 'D,F#,A'
        },
        {
          strings: 'X X 0 2 3 1',
          fingering: 'X X X 2 3 1',
          chordName: 'D,m,,',
          enharmonicChordName: 'D,m,,',
          voicingID: '9223372036891542527',
          tones: 'D,F,A'
        },
        {
          strings: 'X X 0 2 1 2',
          fingering: 'X X X 2 1 3',
          chordName: 'D,,7,',
          enharmonicChordName: 'D,,7,',
          voicingID: '9223372036922999807',
          tones: 'D,F#,A,C'
        },
        {
          strings: 'X X 0 2 2 2',
          fingering: 'X X X 2 3 4',
          chordName: 'D,maj,7,',
          enharmonicChordName: 'D,maj,7,',
          voicingID: '9223372036924048383',
          tones: 'D,F#,A,C#'
        },
        {
          strings: 'X X 0 2 1 1',
          fingering: 'X X X 2 1 1',
          chordName: 'D,m,7,',
          enharmonicChordName: 'D,m,7,',
          voicingID: '9223372036889445375',
          tones: 'D,F,A,C'
        },
        {
          strings: 'X X 0 2 X X',
          fingering: 'X X X 2 X X',
          chordName: 'D,,5,',
          enharmonicChordName: 'D,,5,',
          voicingID: '9223372037927535615',
          tones: 'D,A'
        },
        {
          strings: 'X X 0 1 0 1',
          fingering: 'X X X 1 X 2',
          chordName: 'D,dim,7,',
          enharmonicChordName: 'D,dim,7,',
          voicingID: '9223372036888364031',
          tones: 'D,F,Ab,B'
        },
        {
          strings: 'X X 0 1 1 1',
          fingering: 'X X X 1 1 1',
          chordName: 'D,m,7b5,',
          enharmonicChordName: 'D,m,7b5,',
          voicingID: '9223372036889412607',
          tones: 'D,F,Ab,C'
        },
        {
          strings: 'X X 0 2 0 2',
          fingering: 'X X X 2 X 3',
          chordName: 'D,,6,',
          enharmonicChordName: 'D,,6,',
          voicingID: '9223372036921951231',
          tones: 'D,F#,A,B'
        },
        {
          strings: 'X X 0 2 0 1',
          fingering: 'X X X 2 X 1',
          chordName: 'D,m,6,',
          enharmonicChordName: 'D,m,6,',
          voicingID: '9223372036888396799',
          tones: 'D,F,A,B'
        }
      ],
      E: [
        {
          strings: '0 2 2 1 0 0',
          fingering: 'X 2 3 1 X X',
          chordName: 'E,,,',
          enharmonicChordName: 'E,,,',
          voicingID: '9223372036854810688',
          tones: 'E,G#,B'
        },
        {
          strings: '0 2 2 0 0 0',
          fingering: 'X 2 3 X X X',
          chordName: 'E,m,,',
          enharmonicChordName: 'E,m,,',
          voicingID: '9223372036854777920',
          tones: 'E,G,B'
        },
        {
          strings: '0 2 0 1 0 0',
          fingering: 'X 2 X 1 X X',
          chordName: 'E,,7,',
          enharmonicChordName: 'E,,7,',
          voicingID: '9223372036854808640',
          tones: 'E,G#,B,D'
        },
        {
          strings: '0 X 2 4 4 4',
          fingering: 'X X 1 2 3 4',
          chordName: 'E,maj,7,',
          enharmonicChordName: 'E,maj,7,',
          voicingID: '9223372036993321952',
          tones: 'E,G#,B,D#'
        },
        {
          strings: '0 2 0 0 0 0',
          fingering: 'X 2 X X X X',
          chordName: 'E,m,7,',
          enharmonicChordName: 'E,m,7,',
          voicingID: '9223372036854775872',
          tones: 'E,G,B,D'
        },
        {
          strings: '0 2 X X X X',
          fingering: 'X 2 X X X X',
          chordName: 'E,,5,',
          enharmonicChordName: 'E,,5,',
          voicingID: '9223372037928516672',
          tones: 'E,B'
        },
        {
          strings: '0 X 2 3 2 3',
          fingering: 'X X 1 3 2 4',
          chordName: 'E,dim,7,',
          enharmonicChordName: 'E,dim,7,',
          voicingID: '9223372036957637600',
          tones: 'E,G,Bb,C#'
        },
        {
          strings: '0 X 0 3 3 3',
          fingering: 'X X X 2 3 4',
          chordName: 'E,m,7b5,',
          enharmonicChordName: 'E,m,7b5,',
          voicingID: '9223372036958684128',
          tones: 'E,G,Bb,D'
        },
        {
          strings: '0 X 2 4 2 4',
          fingering: 'X X 1 3 1 4',
          chordName: 'E,,6,',
          enharmonicChordName: 'E,,6,',
          voicingID: '9223372036991224800',
          tones: 'E,G#,B,C#'
        },
        {
          strings: '0 2 2 0 2 X',
          fingering: 'X 2 3 X 4 X',
          chordName: 'E,m,6,',
          enharmonicChordName: 'E,m,6,',
          voicingID: '9223372037897062464',
          tones: 'E,G,B,C#'
        }
      ],
      F: [
        {
          strings: '1 3 3 2 1 1',
          fingering: '1 3 4 2 1 1',
          chordName: 'F,,,',
          enharmonicChordName: 'F,,,',
          voicingID: '9223372036889447521',
          tones: 'F,A,C'
        },
        {
          strings: '1 3 3 1 1 1',
          fingering: '1 3 4 1 1 1',
          chordName: 'F,m,,',
          enharmonicChordName: 'F,m,,',
          voicingID: '9223372036889414753',
          tones: 'F,Ab,C'
        },
        {
          strings: '1 3 1 2 4 1',
          fingering: '1 3 1 2 4 1',
          chordName: 'F,,7,',
          enharmonicChordName: 'F,,7,',
          voicingID: '9223372036892591201',
          tones: 'F,A,C,Eb'
        },
        {
          strings: '1 X 2 2 1 0',
          fingering: '1 X 3 4 2 X',
          chordName: 'F,maj,7,',
          enharmonicChordName: 'F,maj,7,',
          voicingID: '9223372036855892961',
          tones: 'F,A,C,E'
        },
        {
          strings: '1 3 1 1 1 1',
          fingering: '1 3 1 1 1 1',
          chordName: 'F,m,7,',
          enharmonicChordName: 'F,m,7,',
          voicingID: '9223372036889412705',
          tones: 'F,Ab,C,Eb'
        },
        {
          strings: '1 3 X X X X',
          fingering: '1 3 X X X X',
          chordName: 'F,,5,',
          enharmonicChordName: 'F,,5,',
          voicingID: '9223372037928516705',
          tones: 'F,C'
        },
        {
          strings: '1 X 0 1 0 X',
          fingering: '1 X X 3 X X',
          chordName: 'F,dim,7,',
          enharmonicChordName: 'F,dim,7,',
          voicingID: '9223372037894996961',
          tones: 'F,Ab,B,D'
        },
        {
          strings: '1 X 1 1 0 1',
          fingering: '1 X 2 3 X 4',
          chordName: 'F,m,7b5,',
          enharmonicChordName: 'F,m,7b5,',
          voicingID: '9223372036888365025',
          tones: 'F,Ab,B,Eb'
        },
        {
          strings: '1 X 0 2 1 X',
          fingering: '1 X X 4 3 X',
          chordName: 'F,,6,',
          enharmonicChordName: 'F,,6,',
          voicingID: '9223372037896078305',
          tones: 'F,A,C,D'
        },
        {
          strings: '1 X 0 1 1 X',
          fingering: '1 X X 3 4 X',
          chordName: 'F,m,6,',
          enharmonicChordName: 'F,m,6,',
          voicingID: '9223372037896045537',
          tones: 'F,Ab,C,D'
        }
      ],
      G: [
        {
          strings: '3 2 0 0 3 3',
          fingering: '2 1 X X 3 4',
          chordName: 'G,,,',
          enharmonicChordName: 'G,,,',
          voicingID: '9223372036958584899',
          tones: 'G,B,D'
        },
        {
          strings: '3 5 5 3 3 3',
          fingering: '1 3 4 1 1 1',
          chordName: 'G,m,,',
          enharmonicChordName: 'G,m,,',
          voicingID: '9223372036958688419',
          tones: 'G,Bb,D'
        },
        {
          strings: '3 2 0 0 0 1',
          fingering: '3 2 X X X 1',
          chordName: 'G,,7,',
          enharmonicChordName: 'G,,7,',
          voicingID: '9223372036888330307',
          tones: 'G,B,D,F'
        },
        {
          strings: '3 X 4 4 3 X',
          fingering: '1 X 3 4 2 X',
          chordName: 'G,maj,7,',
          enharmonicChordName: 'G,maj,7,',
          voicingID: '9223372037898245091',
          tones: 'G,B,D,F#'
        },
        {
          strings: '3 5 3 3 3 3',
          fingering: '1 3 1 1 1 1',
          chordName: 'G,m,7,',
          enharmonicChordName: 'G,m,7,',
          voicingID: '9223372036958686371',
          tones: 'G,Bb,D,F'
        },
        {
          strings: '3 5 X X X X',
          fingering: '1 3 X X X X',
          chordName: 'G,,5,',
          enharmonicChordName: 'G,,5,',
          voicingID: '9223372037928516771',
          tones: 'G,D'
        },
        {
          strings: '3 X 2 3 2 X',
          fingering: '2 X 1 4 1 X',
          chordName: 'G,dim,7,',
          enharmonicChordName: 'G,dim,7,',
          voicingID: '9223372037897161699',
          tones: 'G,Bb,Db,E'
        },
        {
          strings: '3 X 3 3 2 X',
          fingering: '2 X 3 4 1 X',
          chordName: 'G,m,7b5,',
          enharmonicChordName: 'G,m,7b5,',
          voicingID: '9223372037897162723',
          tones: 'G,Bb,Db,F'
        },
        {
          strings: '3 X 0 0 0 0',
          fingering: '3 X X X X X',
          chordName: 'G,,6,',
          enharmonicChordName: 'G,,6,',
          voicingID: '9223372036854776803',
          tones: 'G,B,D,E'
        },
        {
          strings: '3 X 2 3 3 X',
          fingering: '2 X 1 3 4 X',
          chordName: 'G,m,6,',
          enharmonicChordName: 'G,m,6,',
          voicingID: '9223372037898210275',
          tones: 'G,Bb,D,E'
        }
      ],
      A: [
        {
          strings: 'X 0 2 2 2 0',
          fingering: 'X X 2 3 4 X',
          chordName: 'A,,,',
          enharmonicChordName: 'A,,,',
          voicingID: '9223372036856940575',
          tones: 'A,C#,E'
        },
        {
          strings: 'X 0 2 2 1 0',
          fingering: 'X X 2 3 1 X',
          chordName: 'A,m,,',
          enharmonicChordName: 'A,m,,',
          voicingID: '9223372036855891999',
          tones: 'A,C,E'
        },
        {
          strings: 'X 0 2 0 2 0',
          fingering: 'X X 2 X 3 X',
          chordName: 'A,,7,',
          enharmonicChordName: 'A,,7,',
          voicingID: '9223372036856875039',
          tones: 'A,C#,E,G'
        },
        {
          strings: 'X 0 2 2 2 4',
          fingering: 'X X 1 1 1 3',
          chordName: 'A,maj,7,',
          enharmonicChordName: 'A,maj,7,',
          voicingID: '9223372036991158303',
          tones: 'A,C#,E,G#'
        },
        {
          strings: 'X 0 2 0 1 0',
          fingering: 'X X 2 X 1 X',
          chordName: 'A,m,7,',
          enharmonicChordName: 'A,m,7,',
          voicingID: '9223372036855826463',
          tones: 'A,C,E,G'
        },
        {
          strings: 'X 0 2 X X X',
          fingering: 'X X 2 X X X',
          chordName: 'A,,5,',
          enharmonicChordName: 'A,,5,',
          voicingID: '9223372037928486943',
          tones: 'A,E'
        },
        {
          strings: 'X 0 4 5 4 X',
          fingering: 'X X 1 3 2 X',
          chordName: 'A,dim,7,',
          enharmonicChordName: 'A,dim,7,',
          voicingID: '9223372037899325471',
          tones: 'A,C,Eb,F#'
        },
        {
          strings: 'X 0 1 0 1 X',
          fingering: 'X X 1 X 2 X',
          chordName: 'A,m,7b5,',
          enharmonicChordName: 'A,m,7b5,',
          voicingID: '9223372037896012831',
          tones: 'A,C,Eb,G'
        },
        {
          strings: 'X 0 2 2 2 2',
          fingering: 'X X 1 1 1 1',
          chordName: 'A,,6,',
          enharmonicChordName: 'A,,6,',
          voicingID: '9223372036924049439',
          tones: 'A,C#,E,F#'
        },
        {
          strings: 'X 0 4 5 5 X',
          fingering: 'X X 1 2 3 X',
          chordName: 'A,m,6,',
          enharmonicChordName: 'A,m,6,',
          voicingID: '9223372037900374047',
          tones: 'A,C,E,F#'
        }
      ],
      B: [
        {
          strings: 'X 2 4 4 4 2',
          fingering: 'X 1 2 3 4 1',
          chordName: 'B,,,',
          enharmonicChordName: 'B,,,',
          voicingID: '9223372036926214239',
          tones: 'B,D#,F#'
        },
        {
          strings: 'X 2 4 4 3 2',
          fingering: 'X 1 3 4 2 1',
          chordName: 'B,m,,',
          enharmonicChordName: 'B,m,,',
          voicingID: '9223372036925165663',
          tones: 'B,D,F#'
        },
        {
          strings: 'X 2 4 2 4 2',
          fingering: 'X 1 3 1 4 1',
          chordName: 'B,,7,',
          enharmonicChordName: 'B,,7,',
          voicingID: '9223372036926148703',
          tones: 'B,D#,F#,A'
        },
        {
          strings: 'X 2 4 3 4 2',
          fingering: 'X 1 3 2 4 1',
          chordName: 'B,maj,7,',
          enharmonicChordName: 'B,maj,7,',
          voicingID: '9223372036926181471',
          tones: 'B,D#,F#,A#'
        },
        {
          strings: 'X 2 0 2 0 2',
          fingering: 'X 2 X 3 X 4',
          chordName: 'B,m,7,',
          enharmonicChordName: 'B,m,7,',
          voicingID: '9223372036921950303',
          tones: 'B,D,F#,A'
        },
        {
          strings: 'X 2 4 X X X',
          fingering: 'X 1 3 X X X',
          chordName: 'B,,5,',
          enharmonicChordName: 'B,,5,',
          voicingID: '9223372037928489055',
          tones: 'B,F#'
        },
        {
          strings: 'X 2 3 1 3 X',
          fingering: 'X 2 3 1 4 X',
          chordName: 'B,dim,7,',
          enharmonicChordName: 'B,dim,7,',
          voicingID: '9223372037898144863',
          tones: 'B,D,F,G#'
        },
        {
          strings: 'X 2 3 2 3 X',
          fingering: 'X 1 3 2 4 X',
          chordName: 'B,m,7b5,',
          enharmonicChordName: 'B,m,7b5,',
          voicingID: '9223372037898177631',
          tones: 'B,D,F,A'
        },
        {
          strings: 'X 2 1 1 0 2',
          fingering: 'X 3 1 2 X 4',
          chordName: 'B,,6,',
          enharmonicChordName: 'B,,6,',
          voicingID: '9223372036921918559',
          tones: 'B,D#,F#,G#'
        },
        {
          strings: 'X 2 4 1 3 X',
          fingering: 'X 2 4 1 3 X',
          chordName: 'B,m,6,',
          enharmonicChordName: 'B,m,6,',
          voicingID: '9223372037898145887',
          tones: 'B,D,F#,G#'
        }
      ]
    };

    /* src/GuitarChord.svelte generated by Svelte v3.46.4 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (127:0) {#each getChords(note) as chord}
    function create_each_block(ctx) {
    	let p;
    	let span0;
    	let t0_value = displayName(/*chord*/ ctx[10].chordName) + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*chord*/ ctx[10].strings + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*chord*/ ctx[10].fingering + "";
    	let t4;
    	let t5;

    	return {
    		c() {
    			p = element("p");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, span0);
    			append(span0, t0);
    			append(p, t1);
    			append(p, span1);
    			append(span1, t2);
    			append(p, t3);
    			append(p, span2);
    			append(span2, t4);
    			append(p, t5);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*note*/ 8 && t0_value !== (t0_value = displayName(/*chord*/ ctx[10].chordName) + "")) set_data(t0, t0_value);
    			if (dirty & /*note*/ 8 && t2_value !== (t2_value = /*chord*/ ctx[10].strings + "")) set_data(t2, t2_value);
    			if (dirty & /*note*/ 8 && t4_value !== (t4_value = /*chord*/ ctx[10].fingering + "")) set_data(t4, t4_value);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let canvas_1;
    	let t0;
    	let br;
    	let t1;
    	let each_1_anchor;
    	let each_value = /*getChords*/ ctx[4](/*note*/ ctx[3]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			canvas_1 = element("canvas");
    			t0 = space();
    			br = element("br");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			this.c = noop;
    			attr(canvas_1, "width", /*width*/ ctx[0]);
    			attr(canvas_1, "height", /*height*/ ctx[1]);
    			set_style(canvas_1, "border", "1px solid #000000");
    		},
    		m(target, anchor) {
    			insert(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[7](canvas_1);
    			insert(target, t0, anchor);
    			insert(target, br, anchor);
    			insert(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*width*/ 1) {
    				attr(canvas_1, "width", /*width*/ ctx[0]);
    			}

    			if (dirty & /*height*/ 2) {
    				attr(canvas_1, "height", /*height*/ ctx[1]);
    			}

    			if (dirty & /*getChords, note, displayName*/ 24) {
    				each_value = /*getChords*/ ctx[4](/*note*/ ctx[3]);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(canvas_1);
    			/*canvas_1_binding*/ ctx[7](null);
    			if (detaching) detach(t0);
    			if (detaching) detach(br);
    			if (detaching) detach(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function showDetune(detune) {
    	return isNaN(detune) || (detune > 195 || detune < -195)
    	? ''
    	: detune;
    }

    function showHz(pitch) {
    	return pitch === -1 ? 'no signal' : "Hz: " + Math.round(pitch);
    }

    function showDevice(device) {
    	let offset = device.lastIndexOf("(");
    	return device.substring(0, offset - 1);
    }

    function displayName(chordDataName) {
    	return chordDataName.split(',').join('');
    }

    function instance($$self, $$props, $$invalidate) {
    	let { width = 300 } = $$props;
    	let { height = 150 } = $$props;

    	function updateCanvas(ctx, device, pitch, note, detune) {
    		ctx.fillStyle = "rgb(245,245,245)";
    		ctx.fillRect(0, 0, width, height);
    		ctx.fillStyle = "rgb(0, 0, 0)";
    		ctx.font = "9px Arial";
    		ctx.fillText(device, 1, height - 1);
    		ctx.font = "12px Arial";
    		ctx.fillText(pitch, 3, 14);
    		ctx.font = "12px Arial";

    		if (detune < 0) {
    			ctx.fillText(detune, width / 2 - 8, height - 30);
    		} else {
    			ctx.fillText(detune, width / 2 - 5, height - 30);
    		}

    		ctx.font = "50px Arial";
    		ctx.fillText(note, width / 2 - 15, height / 3 * 2);
    		ctx.beginPath();
    		ctx.moveTo(width / 2, 0);
    		ctx.lineTo(width / 2, 5);
    		ctx.stroke();
    		ctx.closePath();

    		let color = Math.abs(detune) * 10 > 255
    		? 255
    		: Math.abs(detune) * 10;

    		ctx.strokeStyle = "rgb(" + color + ", 0, 0)";
    		ctx.beginPath();
    		ctx.arc(width / 2, height - 20, 2, 0, 2 * Math.PI);
    		ctx.moveTo(width / 2, height - 20);
    		ctx.lineTo(width / 2 + detune * 2, Math.abs(detune) - Math.abs(Math.round(detune / 3)) + 10);
    		ctx.stroke();
    		ctx.closePath();
    	}

    	function startScreenCanvas(ctx) {
    		ctx.fillStyle = "rgb(245,245,245)";
    		ctx.fillRect(0, 0, width, height);
    		ctx.fillStyle = "rgb(6, 6, 6)";
    		ctx.font = "18px Arial";
    		ctx.fillText("init app ...", width / 2 - 45, height / 2);
    		ctx.beginPath();
    		ctx.moveTo(width / 2, 0);
    		ctx.lineTo(width / 2, 5);
    		ctx.stroke();
    		ctx.closePath();
    	}

    	let canvas;
    	let ctx;
    	let note = '';

    	onMount(async () => {
    		ctx = canvas.getContext("2d");
    		startScreenCanvas(ctx);

    		const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
    			console.error(err);
    		});

    		let audioTracks = stream.getAudioTracks();
    		let device = audioTracks[0].label;
    		let AudioContext = window.AudioContext || window.webkitAudioContext || navigator.mozGetUserMedia;
    		let aCtx = new AudioContext();
    		const analyser = aCtx.createAnalyser();
    		analyser.fftSize = 2048;
    		const microphone = aCtx.createMediaStreamSource(stream);
    		microphone.connect(analyser);
    		let fData = new Float32Array(analyser.frequencyBinCount);
    		let pitch = -1;
    		let detune = 0;

    		(function update() {
    			analyser.getFloatTimeDomainData(fData);
    			pitch = pitchDetection(fData, aCtx.sampleRate);
    			detune = detuneFromPitch(pitch, note);
    			$$invalidate(3, note = pitchToNote(pitch));
    			updateCanvas(ctx, showDevice(device), showHz(pitch), showNote(note), showDetune(detune));

    			setTimeout(
    				() => {
    					update();
    				},
    				100
    			);
    		})();
    	});

    	function showNote(note) {
    		let notevalue = '';

    		if (note) {
    			notevalue = getNoteString(note);
    		}

    		return notevalue;
    	}

    	function getChords(note) {
    		let chords = CHORDS['empty'];
    		let base = getNoteString(note);

    		if (base !== undefined) {
    			base = base.substring(0, 1);
    			chords = CHORDS[base];
    		}

    		return chords;
    	}

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(2, canvas);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('width' in $$props) $$invalidate(0, width = $$props.width);
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    	};

    	return [
    		width,
    		height,
    		canvas,
    		note,
    		getChords,
    		updateCanvas,
    		startScreenCanvas,
    		canvas_1_binding
    	];
    }

    class GuitarTuner extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				width: 0,
    				height: 1,
    				updateCanvas: 5,
    				startScreenCanvas: 6
    			},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["width", "height", "updateCanvas", "startScreenCanvas"];
    	}

    	get width() {
    		return this.$$.ctx[0];
    	}

    	set width(width) {
    		this.$$set({ width });
    		flush();
    	}

    	get height() {
    		return this.$$.ctx[1];
    	}

    	set height(height) {
    		this.$$set({ height });
    		flush();
    	}

    	get updateCanvas() {
    		return this.$$.ctx[5];
    	}

    	get startScreenCanvas() {
    		return this.$$.ctx[6];
    	}
    }

    customElements.define("guitar-tuner", GuitarTuner);

    return GuitarTuner;

}());
