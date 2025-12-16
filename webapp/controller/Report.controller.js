sap.ui.define(
    [
        "../controller/App.controller",
        "../model/formatter",
        "sap/m/MessageBox",
        "sap/ui/core/BusyIndicator",
    ],
    (
        Controller,
        formatter,
        MessageBox,
        BusyIndicator
    ) => {
        "use strict";

        return Controller.extend("com.karsan.qm.taskmanage.controller.Report", {
            formatter: formatter,
            onInit: function () {
                this.getRouter().getRoute("Report").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function () {
                this.getOwnerComponent().getModel().metadataLoaded().then(() => {
                    this._getUserInformation();
                });
                this._setSFBconfig();
            },

            _getUserInformation: function () {
                if (window.top === window) return;

                BusyIndicator.show();
                this._readBtpWorkzoneId().then((oResult) => {
                    const sBTPWorkzoneID = oResult.BtpWorkzoneID || oResult.BtpLinkID || oResult.BtpLink || "";
                    const fnHandleMessage = async (oEvent) => {
                        if (oEvent.origin !== sBTPWorkzoneID) return;
                        try {
                            const oData = JSON.parse(oEvent.data);
                            if (oData?.RequestID === "UserMailRequest" && oData.UserMail) {
                                clearInterval(oIntervalID);
                                window.removeEventListener("message", fnHandleMessage);
                                await this._verifySupplierEmail(oData.UserMail);
                            }
                        } catch (err) {
                            this._rejectInvalidUserAccess(fnHandleMessage, oIntervalID);
                        }
                    };

                    window.addEventListener("message", fnHandleMessage);
                    const oIntervalID = setInterval(() => {
                        window.top.postMessage(
                            JSON.stringify({
                                RequestID: "UserMailRequest"
                            }),
                            sBTPWorkzoneID
                        );
                    }, 3000);
                }).catch(() => {
                    BusyIndicator.hide();
                    this._rejectInvalidUserAccess();
                });
            },
            _readBtpWorkzoneId: function (sEmail) {
                const oModel = this.getOwnerComponent().getModel("btpService");
                return new Promise((resolve, reject) => {
                    oModel.read(`/BtpLinkSet('OWN')`, {
                        success: resolve,
                        error: reject
                    });
                });
            },
            _verifySupplierEmail: async function (sEmail) {
                try {
                    const oUserData = await this._readUserByEmail(sEmail);
                    this.getView().getModel().setHeaders({
                        email: sEmail
                    });
                    BusyIndicator.hide();
                } catch (err) {
                    this._rejectInvalidUserAccess();
                }
            },
            _readUserByEmail: function (sEmail) {
                const oModel = this.getOwnerComponent().getModel("btpService");

                return new Promise((resolve, reject) => {
                    oModel.read(`/SupplierLogonInfoSet('${sEmail}')`, {
                        success: resolve,
                        error: reject
                    });
                });
            },
            _rejectInvalidUserAccess: function (fnHandleMessage, oIntervalID) {
                BusyIndicator.hide();
                if (oIntervalID) clearInterval(oIntervalID);
                if (fnHandleMessage) window.removeEventListener("message", fnHandleMessage);

                let vErrorTxt = this.getView().getModel("i18n").getProperty("AuthSupplierNotFound");
                MessageBox.error(vErrorTxt, {
                    actions: [MessageBox.Action.CLOSE],
                    onClose: () => {
                        history.go(-1);
                    }
                });
            },

            onSelectNotif: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("rowBindingContext").getObject();
                this.getViewModel().setProperty("/NavParams", {
                    View: "Notif",
                    Qmnum: oSelectedItem.Qmnum,
                    Manum: oSelectedItem.Manum,
                    Action: "Display"
                });
                this.getRouter().navTo("Task", {
                    Qmnum: oSelectedItem.Qmnum,
                    Manum: oSelectedItem.Manum,
                });
            },

            _setSFBconfig: function () {
                var oSFB = this.byId("idSfbReportSet");
                if (oSFB) {

                    oSFB.attachInitialise(function () {

                        var aKeys = ["Qmart"]; // ihtiyaca göre ekle/çıkar
                        aKeys.forEach(function (sKey) {
                            var oControl = oSFB.getControlByKey(sKey);
                            if (oControl && typeof oControl.setEnabled === "function") {
                                oControl.setEnabled(false);
                            }
                            // bazı kontroller için setEditable olabilir
                            if (oControl && typeof oControl.setEditable === "function") {
                                oControl.setEditable(false);
                            }
                        });
                    });
                }
            },

            _toggleVisibleSupplierFilter: function () {
                var oSFB = this.byId("idSfbReportSet");
                if (oSFB) {
                    var oControl = oSFB.getControlByKey("Lifnum");
                    if (oControl) {
                        oControl.setVisible(!oControl.getVisible());
                    }
                }
            }

        });
    });


