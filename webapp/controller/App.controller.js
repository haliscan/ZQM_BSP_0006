sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "../model/formatter",
    "sap/m/Text",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/MessageView",
    "sap/m/MessageItem"
  ],
  (
    BaseController,
    MessageBox,
    formatter,
    Text,
    Button,
    Dialog,
    MessageView,
    MessageItem
  ) => {
    "use strict";

    var oData;

    return BaseController.extend("com.karsan.qm.taskmanage.controller.App", {
      formatter: formatter,

      onInit: function () {
        oData = this.getOwnerComponent().getModel();
        oData.setSizeLimit(1000000);
      },

      getRouter: function () {
        return this.getOwnerComponent().getRouter();
      },

      getModel: function (sPath) {
        return this.getView().getModel(sPath);
      },

      getViewModel: function () {
        return this.getView().getModel("viewModel");
      },

      getText(vCode) {
        let oResourceBundle = this.getModel("i18n").getResourceBundle();
        return oResourceBundle.getText(vCode);
      },

      confirmAction(sMessage) {
        let that = this;
        return new Promise(function (resolve) {
          var oDialog = new Dialog({
            title: that.getText("AreYouSure"),
            type: "Message",
            state: "Warning",
            content: new Text({ text: sMessage }),
            beginButton: new Button({
              text: that.getText("Yes"),
              type: "Emphasized",
              press: function () {
                oDialog.close();
                resolve(true);
              }
            }),
            endButton: new Button({
              text: that.getText("Cancel"),
              type: "Reject",
              press: function () {
                oDialog.close();
                resolve(false);
              }
            }),
            afterClose: function () {
              oDialog.destroy();
            }
          });
          that.getView().addDependent(oDialog);
          oDialog.open();
        });
      },

      readEntity: function (sPath, mParameters = {}) {
        return new Promise(function (resolve, reject) {
          oData.read("/" + sPath, {
            urlParameters: mParameters.urlParameters || {},
            success: function (oData) {
              resolve(oData);
            },
            error: function (oError) {
              reject(oError);
            }
          });
        });
      },

      readEntitySet: function (sEntitySetName, mParameters = {}) {
        return new Promise(function (resolve, reject) {
          oData.read("/" + sEntitySetName, {
            filters: mParameters.filters || [],
            urlParameters: mParameters.urlParameters || {},
            success: function (oData) {
              resolve(oData);
            },
            error: function (oError) {
              reject(oError);
            }
          });
        });
      },

      _showMessage: function (aPassed) {

        aPassed = Array.isArray(aPassed) ? aPassed : (aPassed ? [aPassed] : []);
        let aExist = this.getViewModel().getProperty("/Messages") || [];
        let aMessages = this._formatMessage([...aExist, ...aPassed]);

        this.getViewModel().setProperty("/Messages", aMessages);
        this.getViewModel().refresh(true);

        if (!aMessages || aMessages.length === 0) { return; }

        if (!this._oDMessages) {

          const oMessageView = new MessageView();
          oMessageView.setModel(this.getViewModel(), "viewModel");
          oMessageView.unbindAggregation("items");

          oMessageView.attachActiveTitlePress(function (oEvent) {
            const oItem = oEvent.getParameter("item");
            if (oItem) {
              const sControlId = oItem.getBindingContext("viewModel").getProperty("controlId");
              if (sControlId) {
                const oControl = this.getView().byId(sControlId);
                if (oControl) {
                  oControl.focus();
                  if (oControl.setValueState) {
                    oControl.setValueState("Error");
                    this.onCloseDMessages();
                  }
                }
              }
            }
          }.bind(this));

          oMessageView.bindAggregation("items", {
            model: "viewModel",
            path: "/Messages",
            templateShareable: false,
            template: new MessageItem({
              type: "{viewModel>type}",
              title: "{viewModel>title}",
              subtitle: "{viewModel>subtitle}",
              description: "{viewModel>description}",
              groupName: "{viewModel>groupName}",
              activeTitle: "{viewModel>activeTitle}",
            })
          });

          this._oDMessages = new Dialog({
            title: this.getText("DMessagesTitle") || "Mesajlar",
            type: "Message",
            contentWidth: "50%",
            contentHeight: "60vh",
            resizable: true,
            draggable: true,
            state: "Information",
            content: [oMessageView],
            endButton: new Button({
              text: this.getText("Close") || "Kapat",
              press: function () { this.onCloseDMessages(); }.bind(this)
            }),
            afterOpen: function () {
              const $mv = oMessageView.$();
              if ($mv && $mv.length) {
                const winH = window.innerHeight || $(window).height();
                const desired = Math.max(200, Math.round(winH * 0.6) - 120);
                $mv.css({ height: desired + "px", overflow: "auto" });
              }
            }
          });
          this.getView().addDependent(this._oDMessages);
          this._oMessageView = oMessageView;
        }
        setTimeout(function () {
          this._setValueStateByMessages();
          this._oDMessages.open();
        }.bind(this), 0);
      },

      _setValueStateByMessages: function () {
        let aMessages = this.getViewModel().getProperty("/Messages") || [];
        aMessages.forEach(oMessage => {
          if (oMessage.controlId && oMessage.type === "Error") {
            this.getView().byId(oMessage.controlId)?.setValueState("Error");
          }
        });
      },

      onCloseDMessages: function () {

        this._clearMessages();

        if (this._oDMessages) {
          this._oDMessages.close();
        }

        let aAction = this.getViewModel().getProperty("/WaitingAction");
        aAction.sort((a, b) => a.seqnr - b.seqnr);
        aAction.forEach(oAction => {
          eval(`${oAction.function}(oAction.event)`);
        });
        this.getViewModel().setProperty("/WaitingAction", []);

      },

      _formatMessage: function (data) {

        if (!Array.isArray(data)) {
          data = [data];
        }

        const mapType = t => {
          if (!t) { return "None"; }
          switch (t) {
            case "S": return "Success";
            case "W": return "Warning";
            case "E": return "Error";
            case "A": return "Error";
            case "X": return "Error";
            case "I": return "Information";
            default: return t;
          }
        };

        const seen = new Set();
        const out = [];

        if (!Array.isArray(data)) { return out; }

        data.forEach(e => {
          const desc = (e.description || e.Message || e.message || "").toString();
          if (!desc) { return; }
          if (seen.has(desc)) { return; }
          seen.add(desc);

          const item = {
            type: e.type || mapType(e.Type) || "None",
            title: (e.title || desc).toString(),
            subtitle: (e.subtitle || e.Id + e.Number || "").toString(),
            description: desc,
            groupName: (e.groupName || "").toString(),
            activeTitle: e.activeTitle || false,
            controlId: e.controlId || null
          };

          out.push(item);
        });

        return out;
      },

      _addMessage: function (oMessage) {
        let aMsg = this._formatMessage(oMessage);
        let aMessages = this.getViewModel().getProperty("/Messages") || [];
        aMsg.forEach(newMsg => {
          const exists = aMessages.some(existingMsg => existingMsg.description === newMsg.description);
          if (!exists) {
            aMessages.push(newMsg);
          }
        });
        this.getViewModel().setProperty("/Messages", aMessages);
      },

      _clearMessages: function () {
        this.getViewModel().setProperty("/Messages", []);
      },

      getCurrentTimeEdmFormat() {
        const now = new Date();
        const ms = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;
        return {
          ms: ms,
          __edmType: "Edm.Time"
        };
      },

      _formatDate: function (pDate) {
        if (pDate instanceof Date) {
          var r = pDate.getTimezoneOffset();
          pDate.setMinutes(pDate.getMinutes() - r);
        }
        return pDate;
      },

      _removeSpaces(sText) {
        if (typeof sText === "string") {
          return sText.replace(/^\s+/, "");
        }
        return sText;
      },

      /* ==== */
      /* CRUD */
      /* ==== */

      onCallFunction(sEntity, sMethod, oModel, oURLParameters) {
        return new Promise((fnResolve, fnReject) => {
          const mParameters = {
            method: sMethod,
            urlParameters: oURLParameters,
            success: fnResolve,
            error: fnReject
          };
          oModel.callFunction(sEntity, mParameters);
        });
      },

      onCreate(sSet, oData, oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            success: fnSuccess,
            error: fnReject
          };
          oModel.create(sSet, oData, mParameters);
        });
      },

      onDelete(sSet, oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            success: fnSuccess,
            error: fnReject
          };
          oModel.remove(sSet, mParameters);
        });
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

      onReadAssociation(sSet, oExpand, oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            urlParameters: oExpand,
            success: fnSuccess,
            error: fnReject
          };
          oModel.read(sSet, mParameters);
        });
      },

      onReadExpanded(sSet, aFilters, oExpand, oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            filters: aFilters,
            urlParameters: oExpand,
            success: fnSuccess,
            error: fnReject
          };
          oModel.read(sSet, mParameters);
        });
      },

      onReadQuery(sSet, aFilters, oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            filters: aFilters,
            success: fnSuccess,
            error: fnReject
          };
          oModel.read(sSet, mParameters);
        });
      },

      onReadQueryAsyncSorters(sSet, aFilters, bAsync, aSorters, oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            async: bAsync,
            filters: aFilters,
            sorters: aSorters,
            success: fnSuccess,
            error: fnReject
          };
          oModel.read(sSet, mParameters);
        });
      },

      onReadQueryParameters(sSet, aFilters, oModel, oURLParameters) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            filters: aFilters,
            urlParameters: oURLParameters,
            success: fnSuccess,
            error: fnReject
          };
          oModel.read(sSet, mParameters);
        });
      },

      onSubmitChanges(oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            success: fnSuccess,
            error: fnReject
          };
          oModel.submitChanges(mParameters);
        });
      },

      onUpdate(sSet, oData, oModel) {
        return new Promise((fnSuccess, fnReject) => {
          const mParameters = {
            success: fnSuccess,
            error: fnReject
          };
          oModel.update(sSet, oData, mParameters);
        });
      } 
      
    });
  }
);


