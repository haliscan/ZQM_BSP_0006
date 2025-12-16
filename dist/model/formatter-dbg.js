sap.ui.define([], function () {
  "use strict";
  return {

    removeSpaces: function (sText) {
      if (typeof sText === "string") {
        return sText.replace(/^\s+/, "");
      }
      return sText;
    },

    formatQuantity: e => {
      var t = 0;
      e === "" || e === undefined ? (t = 0) : (t = e);
      let r = parseFloat(t.toString()).toFixed(3);
      return r.toString();
    },

    formatInteger: e => {
      var t = 0;
      e === "" || e === undefined ? (t = 0) : (t = e);
      let r = parseFloat(t.toString()).toFixed(0);
      return r.toString();
    },

    formatMeasureQuantity: e => {
      if (e === null || e === undefined) {
        return "";
      }
      var t = 0;
      e === "" || e === undefined ? (t = 0) : (t = e);
      let r = parseFloat(t.toString()).toFixed(3);
      if (r.toString() === "0.000") {
        return "";
      }
      return r.toString();
    },

    SetVisibleUnit: (vAmount, vUnit) => {
      if (Number(vAmount) > 0) {
        return vUnit;
      }
      return "";
    },

    formatAmount: e => {
      var t = 0;
      e === "" || e === undefined ? (t = 0) : (t = e);
      let r = parseFloat(t.toString()).toFixed(2);
      return r.toString();
    },

    formatItemNo: e => {
      if (e === null || e === undefined) {
        return "";
      }
      return e.replace(/^0+/, "")
    },

    convertTime: e => {
      return new Date(e.ms).toISOString().slice(11, -5);
    },

    formatFileSelCode: e => {
      if (e === null) {
        e = '';
      }
      return e;
    },

    isActiveTitle: e => {
      return e === "true" ? true : false
    },

    formatEditableSparePart: (sPart, sSparePart) => {
      return sPart === "" ? false : sSparePart === "" ? true : false;
    },

    formatEditableByPartNo: (sPart) => {
      return sPart !== "";
    },

    formatDateToTimestamp: (sDate) => {
      if (!sDate) {
        return "";
      }
      return new Date(sDate).toLocaleString();
    },

    formatMsToTime: function (sTime) {

      if (!sTime || !sTime.ms) {
        return "";
      }

      // 1 saniye = 1000 ms
      const totalSeconds = Math.floor(sTime?.ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // İki haneli gösterim için padStart kullanılır
      let a = [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0")
      ].join(":");

      if (a === "00:00:00") {
        return "";
      }
      return a;
    },

    formatErnam: function (sErnam, sErnamTxt) {
      if (sErnam !== "") {
        return sErnamTxt + " (" + sErnam + ")";
      }
      return sErnamTxt;
    },

    SetVisibleApproveAction: (sAuth, sMncod, sDesicion) => {
      if (sAuth && (sMncod === "1004" || sMncod === "1005")) {
        return !(sDesicion === "OK" || sDesicion === "NOK");
      }
      return false;
    },

    SetVisibleSaveAction: (sAuth, sMncod, sDesicion) => {
      if (sAuth && !(sMncod === "1004" || sMncod === "1005")) {
        return !(sDesicion === "OK" || sDesicion === "NOK");
      }
      return false;
    },

    SetEditableDescr: (sAuth, sDesicion) => {
      if (sAuth) {
        return !(sDesicion === "OK" || sDesicion === "NOK");
      }
      return false;
    },

    SetVisibleTaskStatu: (sAuth, sDesicion) => {
      return (sDesicion === "OK" || sDesicion === "NOK");
    },

  };
});


