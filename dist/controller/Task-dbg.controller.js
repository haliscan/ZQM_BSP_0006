sap.ui.define(
    [
        "../controller/App.controller",
        "sap/m/MessageBox",
        "../model/formatter",
        "sap/ui/core/BusyIndicator",
        "sap/m/ColumnListItem",
        "sap/m/Label",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/table/Column",
        "sap/m/Column",
        "sap/m/Text",
        "sap/ui/core/library",
        "sap/m/MessageItem",
        "sap/m/MessageView",
        "sap/m/Input",
        "sap/m/Button",
        "sap/m/Dialog",
        "sap/m/Bar",
        "sap/m/Title",
        "sap/ui/core/IconPool",
        'sap/ui/core/Core',
        "sap/m/library",
        "sap/m/MessageToast",
        "sap/m/TextArea",
        "sap/ushell/Container",
        "sap/ui/core/format/DateFormat",
        'sap/ui/core/Fragment',
        "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
        "sap/ui/comp/filterbar/FilterBar",
        "sap/ui/comp/filterbar/FilterGroupItem",
        'sap/ui/core/message/ControlMessageProcessor',
        'sap/ui/core/message/Message',
        'sap/ui/core/message/MessageType',
        "sap/ui/core/Messaging",
        'sap/m/MessagePopover',
    ],
    (
        Controller,
        MessageBox,
        formatter,
        BusyIndicator,
        ColumnListItem,
        Label,
        Filter,
        FilterOperator,
        UIColumn,
        MColumn,
        Text,
        coreLibrary,
        MessageItem,
        MessageView,
        Input,
        Button,
        Dialog,
        Bar,
        Title,
        IconPool,
        Core,
        mobileLibrary,
        MessageToast,
        TextArea,
        ShellCont,
        DateFormat,
        Fragment,
        ValueHelpDialog,
        FilterBar,
        FilterGroupItem,
        ControlMessageProcessor,
        Message,
        MessageType,
        Messaging,
        MessagePopover

    ) => {
        "use strict";

        var TitleLevel = coreLibrary.TitleLevel,
            ButtonType = mobileLibrary.ButtonType,
            DialogType = mobileLibrary.DialogType,
            ValueState = coreLibrary.ValueState,
            oData = {};

        return Controller.extend("com.karsan.qm.taskmanage.controller.Task", {

            formatter: formatter,

            onInit: function () {
                this.getRouter().getRoute("Task").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched(oEvent) {
                oData = this.getOwnerComponent().getModel();
                oData.setSizeLimit(1000000);

                this.getViewModel().setProperty("/VisDetail", false);

                let oArg = oEvent.getParameter("arguments");
                this._loadNotif(oArg?.Qmnum, oArg?.Manum);
            },

            _loadNotif: function (vQmnum, vManum) {
                if (!vQmnum && !vManum) {
                    return this.getRouter().navTo("Report");
                }

                BusyIndicator.show();
                let sPath = `/HeaderSet(Qmnum='${vQmnum}',Manum='${vManum}')`;
                oData.read(sPath, {
                    urlParameters: {
                        "$expand": "Approvement,Notif,Auth"
                    },
                    success: async (oResp) => {
                        let hasAuth = await this._checkTaskAuth(oResp.Qmnum);
                        if (hasAuth) {
                            this.getViewModel().setProperty("/VisDetail", true);
                            let oViewModel = this.getViewModel();
                            oViewModel.setProperty("/Header", oResp);
                            oViewModel.setProperty("/Approvement", oResp.Approvement);
                            oViewModel.setProperty("/Notif", oResp.Notif);
                            oViewModel.setProperty("/Auth", oResp.Auth);
                        }
                        BusyIndicator.hide();
                    },
                    error: (e) => {
                        let aMessages = [];
                        let aDefaultMsg = this.getView().getModel().getMessagesByPath("");
                        let aEntityMsg = this.getView().getModel().getMessagesByEntity("/HeaderSet");
                        aMessages = [...aDefaultMsg, ...aEntityMsg];
                        BusyIndicator.hide();
                        this._showMessage(this._formatMessage(aMessages, "FrontSide"));
                    }
                });
            },

            async _checkTaskAuth(sQmnum) {
                if (sQmnum === "INVALID" || sQmnum.includes('UNAUTH')) {
                    BusyIndicator.hide();
                    MessageBox.error(this.getText(sQmnum + "TASK"), {
                        actions: [MessageBox.Action.CLOSE],
                        onClose: function () {
                            this.onNavBack();
                        }.bind(this)
                    });
                } else {
                    return true;
                }
            },

            onSave: function () {
                let that = this;
                if (that._validateTask() !== "OK") {
                    return;
                }

                this.confirmAction(this.getText("ConfirmSaveTask"), this.getView())
                    .then(function (bConfirmed) {
                        if (bConfirmed) {
                            let oReq = that._buildReqHeader();
                            oReq.Util = "Save";
                            that._sendReq(oReq);
                        } else {
                            MessageToast.show(that.getText("MsgCancelled"));
                        }
                    });
            },

            onApprove: function () {
                let that = this;
                if (that._validateTask() !== "OK") {
                    return;
                }

                this.confirmAction(this.getText("ConfirmApproveTask"), this.getView())
                    .then(function (bConfirmed) {
                        if (bConfirmed) {
                            let oReq = that._buildReqHeader();
                            oReq.Util = "Approve";
                            that._sendReq(oReq);
                        } else {
                            MessageToast.show(that.getText("MsgCancelled"));
                        }
                    });
            },

            onReject: function () {
                let that = this;
                if (that._validateTask() !== "OK") {
                    return;
                }

                this.confirmAction(this.getText("ConfirmRejectTask"), this.getView())
                    .then(function (bConfirmed) {
                        if (bConfirmed) {
                            let oReq = that._buildReqHeader();
                            oReq.Util = "Reject";
                            that._sendReq(oReq);
                        } else {
                            MessageToast.show(that.getText("MsgCancelled"));
                        }
                    });
            },

            _sendReq(oReq) {
                let that = this;
                BusyIndicator.show();
                oData.create("/HeaderSet", oReq, {
                    success: oResp => {

                        BusyIndicator.hide();
                        const hasError = oResp.Return.results.some(item =>
                            ["E", "A", "X"].includes(item.Type)
                        );
                        if (!hasError) {
                            that._loadNotif(oResp.Qmnum, oResp.Manum);
                        }

                        let oAction = {
                            seqnr: 1,
                            function: "this.onNavBack",
                            event: {}
                        }
                        that.getViewModel().setProperty("/WaitingAction", [oAction]);
                        that._showMessage(oResp.Return.results);

                    },
                    error: e => {
                        let aMessages = [];
                        let aDefaultMsg = that.getView().getModel().getMessagesByPath("");
                        let aEntityMsg = that.getView().getModel().getMessagesByEntity("/HeaderSet");
                        aMessages = [...aDefaultMsg, ...aEntityMsg];
                        BusyIndicator.hide();
                        that._showMessage(aMessages);
                    }
                });
            },

            _buildReqHeader: function () {
                let oViewModel = this.getViewModel();
                let oHeader = oViewModel.getProperty("/Header");
                let oReq = {
                    Util: "",
                    Qmnum: oHeader.Qmnum,
                    Manum: oHeader.Manum,
                    Approvement: oViewModel.getProperty("/Approvement"),
                    Notif: oViewModel.getProperty("/Notif"),
                    Auth: oViewModel.getProperty("/Auth"),
                    Return: []
                };

                delete oReq.Approvement.__metadata;
                delete oReq.Auth.__metadata;
                delete oReq.Notif.__metadata;
                return oReq;
            },

            _validateTask: function () {
                let oViewModel = this.getViewModel(),
                    oApprovement = oViewModel.getProperty("/Approvement");

                const isEmpty = (value) => value === undefined || value === null || value.trim() === "";
                if (isEmpty(oApprovement.Descr)) {
                    let oMessage = {
                        type: "Error",
                        message: this.getText("ErrEmptyDescr"),
                        subtitle: this.getText("ApprovementTab"),
                        groupName: "",
                        activeTitle: true,
                        controlId: "IdApprovementDescr"
                    };
                    this._addMessage(oMessage);
                    return this._showMessage();
                }

                return "OK";
            },

            onChangeInput(oEvent) {
                var sMain = "",
                    vPath = "",
                    sVal = this._removeSpaces(oEvent.getParameter("value"));
                if (oEvent.getSource().getBinding("value").getContext()) {
                    sMain = oEvent.getSource().getBinding("value").getContext().sPath + '/';
                }
                var sPart = oEvent.getSource().getBinding("value").sPath
                if (!sMain) {
                    vPath = sMain + sPart;
                }
                this.getViewModel().setProperty(vPath, sVal);

                if (sVal !== "") {
                    oEvent.getSource().setValueState("None");
                }
            },

            onNavBack: function () {

                let oViewModel = this.getViewModel();
                oViewModel.setProperty("/Header", {});
                oViewModel.setProperty("/Approvement", {});
                oViewModel.setProperty("/Notif", {});
                oViewModel.setProperty("/Auth", {});

                this.getRouter().navTo("Report");
            }
        });
    });


