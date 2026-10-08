Component({
  properties: {
    value: {
      type: String,
      value: ""
    },
    // AI 正在响应时禁用输入/发送，避免重复提交
    disabled: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onInput(e) {
      this.triggerEvent("change", {
        value: e.detail.value
      });
    },
    send() {
      if (this.data.disabled || !this.data.value || !this.data.value.trim()) {
        return;
      }
      this.triggerEvent("send");
    }
  }
});
