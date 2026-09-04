<template>
  <!-- 整个页面的容器 -->
  <div class="container mt-5">
    
    <!-- 页面标题 -->
    <h1 class="text-center mb-5">商品管理系统</h1>
        <!-- ========== 添加商品按钮 ========== -->
    <div class="mb-4">
      <button 
        class="btn btn-primary" 
        @click="showAddModal = true"              
      >
        + 添加商品
      </button>
    </div>
        <!-- ========== 商品列表表格 ========== -->
    <table class="table table-striped table-bordered">
      <!-- 表头 -->
      <thead class="table-dark">
        <tr>
          <th>ID</th>
          <th>商品名称</th>
          <th>价格</th>
          <th>操作</th>
        </tr>
      </thead>
          <!-- 表体：动态渲染商品列表 -->
      <tbody>
        <!-- v-for 循环遍历 items 数组 -->
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.id }}</td>                    <!-- 显示商品ID -->
          <td>{{ item.name }}</td>                  <!-- 显示商品名称 -->
          <td>¥{{ item.price.toFixed(2) }}</td>     <!-- 显示价格，保留两位小数 -->
          <td>
            <!-- 修改按钮：点击调用 editItem(item) -->
            <button 
              class="btn btn-sm btn-warning me-2" 
              @click="editItem(item)"
            >
              修改
            </button>
            <!-- 删除按钮：点击调用 deleteItem(item.id) -->
            <button 
              class="btn btn-sm btn-danger" 
              @click="deleteItem(item.id)"
            >
              删除
            </button>
          </td>
        </tr>
      </tbody>
    </table>
      <!-- ========== 空状态提示 ========== -->
    <!-- v-if 判断：如果 items 数组长度为0，显示提示文字 -->
    <div v-if="items.length === 0" class="text-center text-muted py-10">
      <p>暂无商品数据</p>
    </div>
      <!-- ========== 添加/修改商品弹窗 ========== -->
    <!-- :class 动态绑定样式，:style 动态控制显示/隐藏 -->
    <div 
      class="modal fade" 
      :class="{ 'show': showAddModal }" 
      tabindex="-1" 
      role="dialog" 
      :style="{ display: showAddModal ? 'block' : 'none' }"
    >
     <!-- 弹窗背景遮罩 -->
      <div class="modal-backdrop" v-if="showAddModal"></div>
      
      <!-- 弹窗内容区 -->
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <!-- 弹窗头部 -->
          <div class="modal-header">
            <!-- 动态标题：根据 isEdit 状态显示不同文字 -->
            <h5 class="modal-title">{{ isEdit ? '修改商品' : '添加商品' }}</h5>
            <!-- 关闭按钮 -->
            <button type="button" class="close" @click="closeModal">
              <span>&times;</span>
            </button>
          </div>
          <!-- 弹窗主体（表单） -->
          <div class="modal-body">
            <!-- @submit.prevent 阻止表单默认提交行为 -->
            <form @submit.prevent="saveItem">
              <!-- 商品名称输入框 -->
              <div class="form-group">
                <label for="name">商品名称</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="name" 
                  v-model="formData.name"  
                  required 
                >
              </div>
              
              <!-- 商品价格输入框 -->
              <div class="form-group">
                <label for="price">商品价格</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="price" 
                  v-model.number="formData.price"  
                  required 
                  min="0"     
                  step="0.01"  
                >
              </div>
              
              <!-- 提交按钮 -->
              <button type="submit" class="btn btn-primary mt-3">
                {{ isEdit ? '保存修改' : '添加商品' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
// ========== 第一步：导入依赖 ==========
import { ref, onMounted } from 'vue'  // 导入 Vue 响应式 API
import axios from 'axios'              // 导入 Axios

// ========== 第二步：定义响应式数据 ==========

// 商品列表数据（数组）
const items = ref([])

// 弹窗相关状态
const showAddModal = ref(false)  // 弹窗是否显示
const isEdit = ref(false)        // 是否为编辑模式
const editId = ref(null)         // 当前编辑的商品ID

// 表单数据
const formData = ref({
  name: '',   // 商品名称
  price: 0    // 商品价格
})

// ========== 第三步：创建 Axios 实例 ==========
const api = axios.create({
  baseURL: '/api',  // 请求基础路径（会被代理转发到后端）
  timeout: 5000     // 请求超时时间（5秒）
})

// ========== 第四步：定义方法 ==========

/**
 * 获取商品列表
 */
const fetchItems = async () => {
  try {
    // 发送 GET 请求到 /items
    const response = await api.get('/items')
    // 将响应数据赋值给 items
    items.value = response.data
  } catch (error) {
    // 请求失败时的错误处理
    console.error('获取商品列表失败:', error)
    alert('获取商品列表失败，请检查后端服务是否启动')
  }
}

/**
 * 添加商品
 */
const addItem = async () => {
  try {
    // 发送 POST 请求，携带表单数据
    await api.post('/items', formData.value)
    // 添加成功后刷新列表
    fetchItems()
    // 关闭弹窗
    closeModal()
    // 提示用户
    alert('添加成功')
  } catch (error) {
    console.error('添加商品失败:', error)
    alert('添加商品失败')
  }
}

/**
 * 修改商品
 */
const updateItem = async () => {
  try {
    // 发送 PUT 请求，携带商品ID和新数据
    await api.put(`/items/${editId.value}`, formData.value)
    // 修改成功后刷新列表
    fetchItems()
    // 关闭弹窗
    closeModal()
    // 提示用户
    alert('修改成功')
  } catch (error) {
    console.error('修改商品失败:', error)
    alert('修改商品失败')
  }
}

/**
 * 保存商品（统一处理添加和修改）
 */
const saveItem = () => {
  if (isEdit.value) {
    // 如果是编辑模式，调用修改方法
    updateItem()
  } else {
    // 如果是添加模式，调用添加方法
    addItem()
  }
}

/**
 * 删除商品
 */
const deleteItem = async (id) => {
  // 弹出确认对话框
  if (!confirm('确定要删除这个商品吗？')) {
    return  // 用户取消则直接返回
  }
  
  try {
    // 发送 DELETE 请求
    await api.delete(`/items/${id}`)
    // 删除成功后刷新列表
    fetchItems()
    // 提示用户
    alert('删除成功')
  } catch (error) {
    console.error('删除商品失败:', error)
    alert('删除商品失败')
  }
}

/**
 * 编辑商品（准备编辑数据）
 */
const editItem = (item) => {
  isEdit.value = true                    // 设置为编辑模式
  editId.value = item.id                 // 记录要编辑的商品ID
  formData.value = {                     // 将商品数据填充到表单
    name: item.name,
    price: item.price
  }
  showAddModal.value = true              // 显示弹窗
}

/**
 * 关闭弹窗
 */
const closeModal = () => {
  showAddModal.value = false  // 隐藏弹窗
  isEdit.value = false        // 重置为添加模式
  editId.value = null         // 清空编辑ID
  formData.value = {          // 重置表单数据
    name: '',
    price: 0
  }
}

// ========== 第五步：生命周期钩子 ==========
// 页面加载完成后自动调用获取商品列表
onMounted(() => {
  fetchItems()
})
</script>

<style scoped>
/* 弹窗背景遮罩样式 */
.modal-backdrop {
  position: fixed;      /* 固定定位 */
  top: 0;               /* 顶部对齐 */
  left: 0;              /* 左侧对齐 */
  width: 100%;          /* 宽度100% */
  height: 100%;         /* 高度100% */
  background-color: rgba(0, 0, 0, 0.5);  /* 半透明黑色背景 */
}
</style>