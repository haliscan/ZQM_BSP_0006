sap.ui.define(
    [
        "../controller/App.controller",
        "../model/formatter",
        "sap/m/MessageBox",
        "sap/ui/core/BusyIndicator",
        "sap/ushell/Container",
    ],
    (
        Controller,
        formatter,
        MessageBox,
        BusyIndicator,
        ShellCont,

    ) => {

        "use strict";

        var oData = {};

        return Controller.extend("com.karsan.qm.taskmanage.controller.Report", {
            formatter: formatter,
            onInit: function () {
                oData = this.getOwnerComponent().getModel();
                oData.setSizeLimit(1000000);
                this.getRouter().getRoute("Report").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function () {
                this.getOwnerComponent().getModel().metadataLoaded().then(async () => {
                    await this._getUserInformation();

                    let sLoggedInUser = ShellCont.getUser().getId().toUpperCase();
                    const sUserPath = oData.createKey("/UserSet", { Uname: sLoggedInUser });
                    const oUser = await this.onRead(sUserPath, oData);
                    this.getViewModel().setProperty("/LoggedUser", oUser);

                    await this.onInitFilter();
                    this._setSFBconfig();
                });

            },

            onInitFilter: async function () {

                let oUser = this.getViewModel().getProperty("/LoggedUser"); 
                let oFbLifnr = this.byId("idSfbReportSet").getControlByKey("Lifnum");
                if (oUser.IsSupplier) {
                    oFbLifnr.removeAllTokens();
                    oFbLifnr.setValue(oUser.Uname);
                    oFbLifnr.setEnabled(false);
                }

            },

            // BTP Workzone User Info
            _getUserInformation: async function () {
                return new Promise((resolve, reject) => {
                    if (window.top === window) {
                        resolve(); // Standalone mode ise devam et
                        return;
                    }

                    BusyIndicator.show();

                    this._readBtpWorkzoneId()
                        .then((oResult) => {
                            const sBTPWorkzoneID = oResult.BtpWorkzoneID || oResult.BtpLinkID || oResult.BtpLink || "";

                            let oIntervalID;
                            const fnHandleMessage = async (oEvent) => {
                                if (oEvent.origin !== sBTPWorkzoneID) return;

                                try {
                                    const oData = JSON.parse(oEvent.data);
                                    if (oData?.RequestID === "UserMailRequest" && oData.UserMail) {
                                        clearInterval(oIntervalID);
                                        window.removeEventListener("message", fnHandleMessage);

                                        await this._verifySupplierEmail(oData.UserMail);
                                        BusyIndicator.hide();
                                        resolve(); // ✅ Suc 
                                    }
                                } catch (err) {
                                    clearInterval(oIntervalID);
                                    window.removeEventListener("message", fnHandleMessage);
                                    this._rejectInvalidUserAccess(fnHandleMessage, oIntervalID);
                                    reject(err); // ✅ Error
                                }
                            };

                            window.addEventListener("message", fnHandleMessage);
                            oIntervalID = setInterval(() => {
                                window.top.postMessage(
                                    JSON.stringify({
                                        RequestID: "UserMailRequest"
                                    }),
                                    sBTPWorkzoneID
                                );
                            }, 3000);
                        })
                        .catch((error) => {
                            BusyIndicator.hide();
                            this._rejectInvalidUserAccess();
                            reject(error); // ✅ Error
                        });
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
                    return oUserData; // ✅ Promise resolve
                } catch (err) {
                    this._rejectInvalidUserAccess();
                    throw err; // ✅ Promise reject
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

            getViewModel: function () {
                return this.getView().getModel("viewModel");
            },

            onRead(sSet, oModel) {
                return new Promise((fnSuccess, fnReject) => {
                    const mParameters = {
                        success: fnSuccess,
                        error: fnReject
                    };
                    oModel.read(sSet, mParameters);
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


