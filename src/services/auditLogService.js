import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service for logging admin actions and system events
 */
export const auditLogService = {
  /**
   * Log an action to the audit log
   * @param {string} adminId - ID of the admin performing the action
   * @param {string} action - Action type (e.g., 'approve_withdrawal', 'refund_participants')
   * @param {string} targetId - ID of the target entity (user, event, etc.)
   * @param {Object} metadata - Additional data about the action
   * @returns {Promise<Object>} - Result of the log insertion
   */
  async logAction(adminId, action, targetId, metadata = {}) {
    try {
      // Vérifier si la table audit_logs existe
      const { error: tableCheckError } = await supabase
        .from('audit_logs')
        .select('id')
        .limit(1);

      // Si la table n'existe pas, on crée une entrée dans une table alternative ou on loggue en console
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.log('Audit log (table not found):', {
          admin_id: adminId,
          action,
          target_id: targetId,
          metadata,
          timestamp: new Date().toISOString()
        });
        
        // Essayer de créer dans une table de logs alternative
        return this.logToAlternativeTable(adminId, action, targetId, metadata);
      }

      // Insérer dans la table audit_logs
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          admin_id: adminId,
          action,
          target_id: targetId,
          metadata,
          ip_address: await this.getClientIp(),
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error logging audit action:', err);
      
      // Fallback: logger dans une table d'erreurs ou en console
      console.error('Failed to log audit action:', {
        admin_id: adminId,
        action,
        target_id: targetId,
        metadata,
        error: err.message
      });
      
      return { success: false, error: err };
    }
  },

  /**
   * Log to alternative table if audit_logs doesn't exist
   */
  async logToAlternativeTable(adminId, action, targetId, metadata) {
    try {
      // Essayer d'abord admin_logs
      const { error: adminLogsError } = await supabase
        .from('admin_logs')
        .insert({
          admin_id: adminId,
          action,
          target_id: targetId,
          details: metadata,
          created_at: new Date().toISOString()
        });

      if (!adminLogsError) {
        return { success: true, table: 'admin_logs' };
      }

      // Sinon, essayer system_logs
      const { error: systemLogsError } = await supabase
        .from('system_logs')
        .insert({
          user_id: adminId,
          log_type: action,
          description: JSON.stringify(metadata),
          related_id: targetId,
          created_at: new Date().toISOString()
        });

      if (!systemLogsError) {
        return { success: true, table: 'system_logs' };
      }

      throw new Error('No suitable log table found');
    } catch (err) {
      console.error('Alternative logging failed:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Get audit logs with filters
   * @param {Object} filters - Filters to apply
   * @returns {Promise<Array>} - List of audit logs
   */
  async getLogs(filters = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, admin:admin_id(full_name, email)')
        .order('created_at', { ascending: false });

      if (filters.adminId) {
        query = query.eq('admin_id', filters.adminId);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.targetId) {
        query = query.eq('target_id', filters.targetId);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Get client IP address (attempts multiple methods)
   * @returns {Promise<string>} - Client IP
   */
  async getClientIp() {
    try {
      // Essayer d'abord avec ipify
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      try {
        // Fallback à ipapi.co
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return data.ip;
      } catch {
        return 'unknown';
      }
    }
  },

  /**
   * Get action statistics
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} - Action statistics
   */
  async getActionStats(options = {}) {
    try {
      const { period = '30d' } = options;
      
      const { data, error } = await supabase
        .rpc('get_audit_log_stats', {
          period_days: period === '7d' ? 7 : period === '30d' ? 30 : 90
        });

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching action stats:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Log bulk actions
   * @param {string} adminId - Admin ID
   * @param {string} action - Action type
   * @param {Array} targetIds - Array of target IDs
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Result of bulk logging
   */
  async logBulkAction(adminId, action, targetIds, metadata = {}) {
    const logs = targetIds.map(targetId => ({
      admin_id: adminId,
      action,
      target_id: targetId,
      metadata: { ...metadata, bulk_action: true },
      created_at: new Date().toISOString()
    }));

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(logs)
        .select();

      if (error) throw error;
      return { success: true, count: data.length, data };
    } catch (err) {
      console.error('Error logging bulk actions:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Clean up old logs
   * @param {number} olderThanDays - Delete logs older than this many days
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupOldLogs(olderThanDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('count');

      if (error) throw error;
      
      return {
        success: true,
        deletedCount: data?.length || 0,
        olderThanDays
      };
    } catch (err) {
      console.error('Error cleaning up logs:', err);
      return { success: false, error: err };
    }
  }
};

export default auditLogService;