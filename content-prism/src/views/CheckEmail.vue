<template>
  <div class="check-email-container">
    <div class="check-email-box">
      <h2>Check Your Email</h2>
      <p>
        Registration successful! Please check your email and click the confirmation link to activate your account. Once confirmed, you can log in.
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: "CheckEmail"
};
</script>

<style scoped>
.check-email-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
}

.check-email-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h2 {
  margin-bottom: 20px;
  color: #002754;
}

p {
  font-size: 16px;
  color: #333;
}
</style> 