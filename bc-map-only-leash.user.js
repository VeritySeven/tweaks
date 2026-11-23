// ==UserScript==
// @name         BC Map-Only Leash
// @namespace    https://www.bondageprojects.com/
// @version      1.0.0
// @description  Lets leashing and tether points work on the map in rooms that block leashing, but the leash never takes anyone out of the room. Both the leasher and the leashed player need this script.
// @include /^https:\/\/(www\.)?bondageprojects\.elementfx\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include /^https:\/\/(www\.)?bondage-europe\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include /^https:\/\/(www\.)?bondageeurope\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include /^https:\/\/(www\.)?bondage-asia\.com\/club\/R\d+(\/((index|\d+)\.html)?)?$/
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
	"use strict";

	if (window.__bcMapOnlyLeashInstalled) return;
	window.__bcMapOnlyLeashInstalled = true;

	const TAG = "[MapOnlyLeash]";

	/** Console switch: BCMapOnlyLeash.enabled = false restores the stock rules immediately */
	const state = { enabled: true, tetherBlocksLeaving: true };
	window.BCMapOnlyLeash = state;

	/** The room has a map (Hybrid or Always) */
	function isMapRoom() {
		const type = ChatRoomData?.MapData?.Type;
		return type === "Hybrid" || type === "Always";
	}

	/** The room blocks leashing and we are overriding that, for the map only */
	function overrideActive() {
		return state.enabled && isMapRoom() && !!ChatRoomData?.BlockCategory?.includes("Leashing");
	}

	/**
	 * Calls fn with the room's "Leashing" block hidden, so the stock leash checks pass.
	 * Fully synchronous, the block is always put back.
	 */
	function callWithLeashUnblocked(fn, self, args) {
		if (!overrideActive()) return fn.apply(self, args);
		const list = ChatRoomData.BlockCategory;
		const idx = list.indexOf("Leashing");
		list.splice(idx, 1);
		try {
			return fn.apply(self, args);
		} finally {
			list.splice(idx, 0, "Leashing");
		}
	}

	function wrap(name, make) {
		const orig = window[name];
		if (typeof orig !== "function") {
			console.warn(TAG, "function not found, skipped:", name);
			return;
		}
		window[name] = make(orig);
	}

	function wrapUnblocked(name) {
		wrap(name, (orig) => function (...args) {
			return callWithLeashUnblocked(orig, this, args);
		});
	}

	function install() {
		// 1) Leasher side: the "hold leash" / "let go" dialog buttons show up
		wrapUnblocked("ChatRoomCanHoldLeash");
		wrapUnblocked("ChatRoomCanStopHoldLeash");

		// 2) Leashed side: accept the leash, keep it when pinged, keep the leash visuals in sync
		wrap("ChatRoomDoHoldLeash", (orig) => function (sender) {
			const before = ChatRoomLeashPlayer;
			const active = overrideActive();
			const result = callWithLeashUnblocked(orig, this, [sender]);
			if (active && sender && ChatRoomLeashPlayer === sender.MemberNumber && before !== ChatRoomLeashPlayer) {
				ChatRoomSendLocal(
					"<i>Map-only leash: this room blocks leashing, so " + CharacterNickname(sender) +
					"'s leash only works on the map. It will never take you out of the room.</i>",
					20000
				);
			}
			return result;
		});
		wrapUnblocked("ChatRoomDoPingLeashedPlayers");
		wrapUnblocked("CharacterRefreshLeash");

		// 2b) Tether points: tie/untie menu, accepting a tie, and keeping a tie valid while the room blocks leashing
		wrapUnblocked("ChatRoomMapViewCanTetherTie");
		wrapUnblocked("ChatRoomMapViewCanTetherUntie");
		wrapUnblocked("ChatRoomMapViewTetherHiddenMessage");
		wrapUnblocked("ChatRoomMapViewTetherIsValid");

		// 3) Being leashed must not stop the leashed player from leaving on their own.
		// Tethers keep the stock behaviour (a tied player stays while someone who can untie them is present)
		// unless state.tetherBlocksLeaving is set to false.
		wrap("ChatRoomCanLeave", (orig) => function (...args) {
			if (!overrideActive()) return orig.apply(this, args);
			const savedLeash = ChatRoomLeashPlayer;
			const savedTether = Player.MapData?.Tether;
			ChatRoomLeashPlayer = null;
			const hideTether = !state.tetherBlocksLeaving && savedTether;
			if (hideTether) delete Player.MapData.Tether;
			try {
				return orig.apply(this, args);
			} finally {
				ChatRoomLeashPlayer = savedLeash;
				if (hideTether && Player.MapData) Player.MapData.Tether = savedTether;
			}
		});

		// 4) The important one: when the holder changes rooms, never follow. The leash is dropped instead.
		wrap("ServerHandleLeashBeep", (orig) => function (data) {
			if (
				overrideActive()
				&& data
				&& ChatRoomLeashPlayer === data.MemberNumber
				&& ChatRoomData?.Name !== data.ChatRoomName
			) {
				ChatRoomBreakLeash(null);
				ChatRoomSendLocal(
					"<i>Map-only leash: your leash holder moved to another room. This room blocks leashing, so you were not taken along and the leash was released.</i>",
					20000
				);
				return Promise.resolve();
			}
			return orig.apply(this, arguments);
		});

		console.info(TAG, "installed");
	}

	// Wait until the game has defined everything we patch
	const required = [
		"ChatRoomCanHoldLeash", "ChatRoomCanStopHoldLeash", "ChatRoomDoHoldLeash",
		"ChatRoomDoPingLeashedPlayers", "ChatRoomCanLeave", "ServerHandleLeashBeep",
		"ChatRoomBreakLeash", "ChatRoomSendLocal", "CharacterNickname",
	];
	const timer = setInterval(() => {
		if (required.every((n) => typeof window[n] === "function")) {
			clearInterval(timer);
			install();
		}
	}, 250);
})();
